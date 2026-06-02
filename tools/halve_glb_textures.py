"""
Resize textures inside a GLB without changing meshes or animations.

Default use from the topic.earth project root:

    python tools/halve_glb_textures.py

This reads:

    assets/models/solar-system.glb

and writes:

    assets/models/solar-system.textures-0.5.glb

Install dependency if needed:

    python -m pip install Pillow
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import math
import struct
from pathlib import Path
from typing import Any

from PIL import Image


GLB_MAGIC = 0x46546C67
GLB_VERSION = 2
CHUNK_TYPE_JSON = 0x4E4F534A
CHUNK_TYPE_BIN = 0x004E4942

DEFAULT_INPUT = Path("assets/models/solar-system.glb")
DEFAULT_OUTPUT = Path("assets/models/solar-system.textures-0.5.glb")


def pad4(data: bytes, pad_byte: bytes = b" ") -> bytes:
    padding = (-len(data)) % 4
    return data + (pad_byte * padding)


def mime_to_format(mime_type: str) -> str:
    mime = (mime_type or "").lower()
    if "png" in mime:
        return "PNG"
    if "webp" in mime:
        return "WEBP"
    return "JPEG"


def format_to_mime(fmt: str) -> str:
    fmt = (fmt or "").upper()
    if fmt == "PNG":
        return "image/png"
    if fmt == "WEBP":
        return "image/webp"
    return "image/jpeg"


def read_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    raw = path.read_bytes()
    if len(raw) < 20:
        raise ValueError(f"Not enough bytes for a GLB: {path}")

    magic, version, total_length = struct.unpack_from("<III", raw, 0)
    if magic != GLB_MAGIC or version != GLB_VERSION:
        raise ValueError(f"Expected GLB v2 file: {path}")
    if total_length != len(raw):
        raise ValueError(f"GLB length mismatch: header={total_length}, actual={len(raw)}")

    offset = 12
    json_chunk: bytes | None = None
    bin_chunk = b""

    while offset + 8 <= len(raw):
        chunk_length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        chunk = raw[offset : offset + chunk_length]
        offset += chunk_length

        if chunk_type == CHUNK_TYPE_JSON:
            json_chunk = chunk
        elif chunk_type == CHUNK_TYPE_BIN:
            bin_chunk = chunk

    if json_chunk is None:
        raise ValueError(f"GLB has no JSON chunk: {path}")

    gltf = json.loads(json_chunk.decode("utf-8").rstrip(" \t\r\n\0"))
    return gltf, bin_chunk


def write_glb(path: Path, gltf: dict[str, Any], bin_chunk: bytes) -> None:
    json_bytes = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_padded = pad4(json_bytes, b" ")
    bin_padded = pad4(bin_chunk, b"\0")

    chunks = [
        struct.pack("<II", len(json_padded), CHUNK_TYPE_JSON) + json_padded,
    ]
    if bin_padded:
        chunks.append(struct.pack("<II", len(bin_padded), CHUNK_TYPE_BIN) + bin_padded)

    total_length = 12 + sum(len(chunk) for chunk in chunks)
    header = struct.pack("<III", GLB_MAGIC, GLB_VERSION, total_length)

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header + b"".join(chunks))


def resize_image_bytes(image_bytes: bytes, mime_type: str, scale: float, quality: int) -> tuple[bytes, str, tuple[int, int], tuple[int, int]]:
    with Image.open(io.BytesIO(image_bytes)) as img:
        original_size = img.size
        next_size = (
            max(1, int(math.floor(original_size[0] * scale))),
            max(1, int(math.floor(original_size[1] * scale))),
        )
        if next_size == original_size:
            return image_bytes, mime_type, original_size, next_size

        resized = img.resize(next_size, Image.Resampling.LANCZOS)
        fmt = img.format or mime_to_format(mime_type)

        output = io.BytesIO()
        save_kwargs: dict[str, Any] = {}
        if fmt.upper() in {"JPEG", "JPG"}:
            if resized.mode in {"RGBA", "LA", "P"}:
                resized = resized.convert("RGB")
            save_kwargs.update({"quality": quality, "optimize": True, "progressive": True})
            fmt = "JPEG"
        elif fmt.upper() == "PNG":
            save_kwargs.update({"optimize": True})
            fmt = "PNG"
        elif fmt.upper() == "WEBP":
            save_kwargs.update({"quality": quality, "method": 6})
            fmt = "WEBP"

        resized.save(output, format=fmt, **save_kwargs)
        return output.getvalue(), format_to_mime(fmt), original_size, next_size


def get_buffer_view_bytes(gltf: dict[str, Any], bin_chunk: bytes, buffer_view_index: int) -> bytes:
    view = gltf["bufferViews"][buffer_view_index]
    offset = int(view.get("byteOffset", 0))
    length = int(view["byteLength"])
    return bin_chunk[offset : offset + length]


def resize_embedded_buffer_images(gltf: dict[str, Any], bin_chunk: bytes, scale: float, quality: int) -> tuple[bytes, list[str]]:
    report: list[str] = []
    replacements: dict[int, bytes] = {}

    for image_index, image in enumerate(gltf.get("images", [])):
        if "bufferView" not in image:
            continue

        buffer_view_index = int(image["bufferView"])
        old_bytes = get_buffer_view_bytes(gltf, bin_chunk, buffer_view_index)
        mime_type = image.get("mimeType", "image/jpeg")
        new_bytes, new_mime, old_size, new_size = resize_image_bytes(old_bytes, mime_type, scale, quality)

        if len(new_bytes) >= len(old_bytes):
            report.append(
                f"image[{image_index}] kept {old_size[0]}x{old_size[1]} because resized file was not smaller"
            )
            continue

        replacements[buffer_view_index] = new_bytes
        image["mimeType"] = new_mime
        report.append(
            f"image[{image_index}] {old_size[0]}x{old_size[1]} -> {new_size[0]}x{new_size[1]} "
            f"({len(old_bytes) / 1024:.1f} KB -> {len(new_bytes) / 1024:.1f} KB)"
        )

    if not replacements:
        return bin_chunk, report

    next_bin = bytearray()
    for view_index, view in enumerate(gltf.get("bufferViews", [])):
        while len(next_bin) % 4:
            next_bin.append(0)

        data = replacements.get(view_index)
        if data is None:
            data = get_buffer_view_bytes(gltf, bin_chunk, view_index)

        view["byteOffset"] = len(next_bin)
        view["byteLength"] = len(data)
        next_bin.extend(data)

    gltf.setdefault("buffers", [{"byteLength": 0}])[0]["byteLength"] = len(next_bin)
    return bytes(next_bin), report


def resize_data_uri_images(gltf: dict[str, Any], scale: float, quality: int) -> list[str]:
    report: list[str] = []

    for image_index, image in enumerate(gltf.get("images", [])):
        uri = image.get("uri", "")
        if not uri.startswith("data:image/") or ";base64," not in uri:
            continue

        header, payload = uri.split(";base64,", 1)
        mime_type = header.removeprefix("data:")
        old_bytes = base64.b64decode(payload)
        new_bytes, new_mime, old_size, new_size = resize_image_bytes(old_bytes, mime_type, scale, quality)

        if len(new_bytes) >= len(old_bytes):
            report.append(
                f"image[{image_index}] kept data URI {old_size[0]}x{old_size[1]} because resized file was not smaller"
            )
            continue

        image["uri"] = f"data:{new_mime};base64,{base64.b64encode(new_bytes).decode('ascii')}"
        image["mimeType"] = new_mime
        report.append(
            f"image[{image_index}] data URI {old_size[0]}x{old_size[1]} -> {new_size[0]}x{new_size[1]}"
        )

    return report


def file_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)


def main() -> None:
    parser = argparse.ArgumentParser(description="Resize GLB textures by a scale factor.")
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--scale", type=float, default=0.5, help="Texture dimension scale, default 0.5")
    parser.add_argument("--quality", type=int, default=86, help="JPEG/WebP quality, default 86")
    args = parser.parse_args()

    if not 0 < args.scale <= 1:
        raise ValueError("--scale must be between 0 and 1")
    if args.output.resolve() == args.input.resolve():
        raise ValueError("Refusing to overwrite input. Use a different --output path.")

    gltf, bin_chunk = read_glb(args.input)
    bin_chunk, embedded_report = resize_embedded_buffer_images(gltf, bin_chunk, args.scale, args.quality)
    data_uri_report = resize_data_uri_images(gltf, args.scale, args.quality)
    report = embedded_report + data_uri_report

    write_glb(args.output, gltf, bin_chunk)

    print(f"Input:  {args.input} ({file_mb(args.input):.2f} MB)")
    print(f"Output: {args.output} ({file_mb(args.output):.2f} MB)")
    if report:
        print("Textures:")
        for line in report:
            print(f"  - {line}")
    else:
        print("No embedded image textures were found. The GLB may use external texture files.")


if __name__ == "__main__":
    main()
