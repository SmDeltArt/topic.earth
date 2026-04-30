const YEARS = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];

const FEVER_WARMING_TRANSLATIONS = {
  fr: {
    best: [
      ["Reference stable", "Le signal de rechauffement humain reste faible par rapport aux decennies suivantes."],
      ["Signal de rechauffement precoce", "La tendance climatique est detectable, mais reste encore relativement limitee."],
      ["Le rechauffement devient visible", "La glace, le niveau de la mer et les ecosystemes montrent des signes de stress plus nets."],
      ["Alerte de l ere actuelle", "Une action forte reste possible, mais plusieurs systemes sont deja sous pression."],
      ["Pic de pression gere", "Le systeme est sous tension, mais l action coordonnee commence a inflechir la courbe."],
      ["Phase de stabilisation", "Certains impacts persistent, mais la trajectoire n accelere plus."],
      ["Horizon de longue recuperation", "Le climat reste transforme, mais l escalation la plus dangereuse est limitee."],
      ["Monde en lente reparation", "Les dommages passes restent visibles, mais la pression du systeme est plus basse que dans les futurs plus durs."]
    ],
    objective: [
      ["Reference stable", "C est la reference visuelle et de donnees pour la simulation ulterieure."],
      ["Signal de rechauffement precoce", "Le systeme commence a se rechauffer, mais les plus grands changements sont encore devant nous."],
      ["Rechauffement clairement visible", "La perte de glace, le stress des ecosystemes et le rechauffement de l ocean deviennent plus mesurables."],
      ["Alerte de l ere actuelle", "Le systeme climatique subit deja une pression humaine durable."],
      ["Instabilite croissante", "Plusieurs risques grandissent ensemble: chaleur, stress hydrique, perte d ecosystemes et perturbation oceanique."],
      ["Phase de dommages composes", "Le monde affronte des effets en cascade plus forts et des limites d adaptation croissantes."],
      ["Stress profond du systeme", "Plusieurs systemes terrestres subissent une pression intense et la recuperation ralentit."],
      ["Dommages a longue traine", "Meme si le rechauffement ralentit ensuite, les impacts restent verrouilles pendant longtemps."]
    ],
    high: [
      ["Reference stable", "La reference semble calme, mais les decennies suivantes divergent fortement dans ce scenario."],
      ["Debut du signal de rechauffement", "La tendance climatique commence de facon similaire, avant l acceleration plus nette qui suit."],
      ["Debut de l acceleration", "Cette trajectoire commence a se separer plus clairement des futurs plus surs."],
      ["Alerte de l ere actuelle", "Le present devient le point de depart d une destabilisation plus rapide."],
      ["Destabilisation majeure en cours", "Chaleur, perte de glace et stress de circulation s intensifient ensemble."],
      ["Phase de risque en cascade", "Les retroactions et les seuils deviennent beaucoup plus difficiles a gerer."],
      ["Perturbation extreme du systeme", "Plusieurs systemes sont pousses pres de seuils majeurs ou au-dela."],
      ["Monde a haut risque installe", "Le climat reste tres instable, avec des consequences mondiales durables."]
    ]
  },
  nl: {
    best: [
      ["Stabiele basislijn", "Het menselijke opwarmingssignaal is nog laag vergeleken met latere decennia."],
      ["Vroeg opwarmingssignaal", "De klimaattrend is meetbaar, maar nog relatief beperkt."],
      ["Opwarming wordt zichtbaar", "IJs, zeespiegel en ecosystemen tonen duidelijkere stress."],
      ["Waarschuwing huidige tijd", "Sterke actie is nog mogelijk, maar meerdere systemen staan al onder druk."],
      ["Beheerde piekdruk", "Het systeem staat onder stress, maar gecoordineerde actie begint de curve om te buigen."],
      ["Stabilisatiefase", "Sommige effecten blijven, maar het pad versnelt niet langer."],
      ["Lange herstelhorizon", "Het klimaat blijft veranderd, maar de gevaarlijkste escalatie is beperkt."],
      ["Langzaam herstellende wereld", "Schade uit het verleden blijft, maar de systeemdruk is lager dan in hardere toekomsten."]
    ],
    objective: [
      ["Stabiele basislijn", "Dit is de visuele en databasislijn voor de latere simulatie."],
      ["Vroeg opwarmingssignaal", "Het systeem begint op te warmen, maar de grootste veranderingen liggen nog voor ons."],
      ["Opwarming duidelijk zichtbaar", "IJsverlies, ecosysteemstress en oceaanopwarming worden beter meetbaar."],
      ["Waarschuwing huidige tijd", "Het klimaatsysteem staat al onder aanhoudende menselijke druk."],
      ["Escalerende instabiliteit", "Meerdere risico's groeien samen: hitte, waterstress, ecosysteemverlies en oceaanverstoring."],
      ["Fase van samengestelde schade", "De wereld krijgt sterkere cascade-effecten en stijgende aanpassingsgrenzen."],
      ["Diepe systeemstress", "Meerdere aardse systemen staan onder intense druk en herstel wordt trager."],
      ["Langdurige schade", "Zelfs als opwarming later vertraagt, blijven systeemeffecten lang vastliggen."]
    ],
    high: [
      ["Stabiele basislijn", "De basislijn lijkt rustig, maar latere decennia wijken sterk af in dit scenario."],
      ["Opwarmingssignaal begint", "De klimaattrend begint vergelijkbaar, voordat de latere versnelling scherper wordt."],
      ["Versnelling begint", "Dit pad begint zich duidelijker te scheiden van veiligere toekomsten."],
      ["Waarschuwing huidige tijd", "Het heden wordt het startpunt voor snellere destabilisatie."],
      ["Grote destabilisatie gaande", "Hitte, ijsverlies en circulatiestress nemen samen toe."],
      ["Cascaderisicofase", "Terugkoppelingen en drempels worden veel moeilijker te beheersen."],
      ["Extreme systeemverstoring", "Meerdere systemen worden dicht bij of voorbij grote drempels geduwd."],
      ["Verankerde hoogrisicowereld", "Het klimaat blijft zeer instabiel, met langdurige wereldwijde gevolgen."]
    ]
  },
  de: {
    best: [
      ["Stabile Ausgangslage", "Das menschliche Erwarmungssignal ist im Vergleich zu spateren Jahrzehnten noch gering."],
      ["Fruhes Erwarmungssignal", "Der Klimatrend ist erkennbar, aber noch relativ begrenzt."],
      ["Erwarmung wird sichtbar", "Eis, Meeresspiegel und Okosysteme zeigen klarere Belastung."],
      ["Warnung der Gegenwart", "Entschlossenes Handeln ist noch moglich, aber mehrere Systeme stehen bereits unter Druck."],
      ["Gesteuerter Belastungsgipfel", "Das System ist belastet, aber koordiniertes Handeln beginnt die Kurve zu biegen."],
      ["Stabilisierungsphase", "Einige Auswirkungen bleiben, aber die Entwicklung beschleunigt sich nicht mehr."],
      ["Langer Erholungshorizont", "Das Klima bleibt verandert, aber die gefahrlichste Eskalation ist begrenzt."],
      ["Langsame Reparaturwelt", "Vergangene Schaden bleiben, aber der Systemdruck ist geringer als in harteren Zukunften."]
    ],
    objective: [
      ["Stabile Ausgangslage", "Dies ist die visuelle und datenbasierte Ausgangslage fur die spatere Simulation."],
      ["Fruhes Erwarmungssignal", "Das System beginnt sich zu erwarmen, aber die grossten Veranderungen liegen noch vor uns."],
      ["Erwarmung klar sichtbar", "Eisverlust, Okosystemstress und Ozeanerwarmung werden messbarer."],
      ["Warnung der Gegenwart", "Das Klimasystem steht bereits unter anhaltendem menschlichem Druck."],
      ["Zunehmende Instabilitat", "Mehrere Risiken wachsen zusammen: Hitze, Wasserstress, Okosystemverlust und Ozeanstorung."],
      ["Phase verstarkter Schaden", "Die Welt erlebt starkere Kaskadeneffekte und wachsende Grenzen der Anpassung."],
      ["Tiefe Systembelastung", "Mehrere Erdsysteme stehen unter starkem Druck und die Erholung wird langsamer."],
      ["Langzeitschaden", "Selbst wenn sich die Erwarmung spater verlangsamt, bleiben Systemfolgen lange festgeschrieben."]
    ],
    high: [
      ["Stabile Ausgangslage", "Die Ausgangslage wirkt ruhig, aber spatere Jahrzehnte weichen in diesem Szenario stark ab."],
      ["Erwarmungssignal beginnt", "Der Klimatrend beginnt ahnlich, bevor die spatere Beschleunigung scharfer wird."],
      ["Beschleunigung beginnt", "Dieser Pfad trennt sich klarer von sichereren Zukunften."],
      ["Warnung der Gegenwart", "Die Gegenwart wird zum Ausgangspunkt schnellerer Destabilisierung."],
      ["Grosse Destabilisierung lauft", "Hitze, Eisverlust und Zirkulationsstress verstarken sich gemeinsam."],
      ["Phase kaskadierender Risiken", "Ruckkopplungen und Schwellen werden viel schwerer zu steuern."],
      ["Extreme Systemstorung", "Mehrere Systeme werden nahe an oder uber wichtige Schwellen gedruckt."],
      ["Verfestigte Hochrisikowelt", "Das Klima bleibt hoch instabil, mit langfristigen globalen Folgen."]
    ]
  },
  es: {
    best: [
      ["Linea base estable", "La senal de calentamiento humano sigue baja frente a las decadas posteriores."],
      ["Senal temprana de calentamiento", "La tendencia climatica es detectable, pero todavia relativamente limitada."],
      ["El calentamiento se vuelve visible", "El hielo, el nivel del mar y los ecosistemas empiezan a mostrar estres mas claro."],
      ["Advertencia de la era actual", "Una accion fuerte sigue siendo posible, pero varios sistemas ya estan bajo presion."],
      ["Pico de presion gestionado", "El sistema esta estresado, pero la accion coordinada empieza a doblar la curva."],
      ["Fase de estabilizacion", "Algunos impactos persisten, pero la trayectoria ya no acelera."],
      ["Horizonte largo de recuperacion", "El clima sigue alterado, pero la escalada mas peligrosa queda limitada."],
      ["Mundo de reparacion lenta", "El dano pasado permanece, pero la presion del sistema es menor que en futuros mas duros."]
    ],
    objective: [
      ["Linea base estable", "Esta es la linea base visual y de datos para la simulacion posterior."],
      ["Senal temprana de calentamiento", "El sistema empieza a calentarse, pero los mayores cambios aun estan por delante."],
      ["Calentamiento claramente visible", "La perdida de hielo, el estres ecosistemico y el calentamiento oceanico se vuelven mas medibles."],
      ["Advertencia de la era actual", "El sistema climatico ya esta bajo presion humana sostenida."],
      ["Inestabilidad en aumento", "Varios riesgos crecen juntos: calor, estres hidrico, perdida de ecosistemas y disrupcion oceanica."],
      ["Fase de dano compuesto", "El mundo enfrenta efectos en cascada mas fuertes y limites crecientes de adaptacion."],
      ["Estres profundo del sistema", "Varios sistemas terrestres estan bajo presion intensa y la recuperacion se vuelve mas lenta."],
      ["Dano de larga cola", "Aunque el calentamiento se desacelere despues, los impactos quedan fijados durante mucho tiempo."]
    ],
    high: [
      ["Linea base estable", "La linea base parece tranquila, pero las decadas posteriores divergen con fuerza en este escenario."],
      ["Comienza la senal de calentamiento", "La tendencia climatica empieza de forma similar, antes de una aceleracion mas brusca."],
      ["Comienza la aceleracion", "Esta ruta empieza a separarse con mas claridad de futuros mas seguros."],
      ["Advertencia de la era actual", "El presente se convierte en el punto de partida de una desestabilizacion mas rapida."],
      ["Gran desestabilizacion en marcha", "El calor, la perdida de hielo y el estres de circulacion se intensifican juntos."],
      ["Fase de riesgo en cascada", "Las retroalimentaciones y los umbrales se vuelven mucho mas dificiles de gestionar."],
      ["Disrupcion extrema del sistema", "Varios sistemas son empujados cerca de, o mas alla de, grandes umbrales."],
      ["Mundo de alto riesgo arraigado", "El clima sigue muy inestable, con consecuencias globales duraderas."]
    ]
  },
  ru: {
    best: [
      ["Стабильная базовая линия", "Сигнал антропогенного потепления пока слаб по сравнению с последующими десятилетиями."],
      ["Ранний сигнал потепления", "Климатический тренд уже заметен, но остается относительно ограниченным."],
      ["Потепление становится видимым", "Лед, уровень моря и экосистемы начинают показывать более явный стресс."],
      ["Предупреждение текущей эпохи", "Решительные действия еще возможны, но несколько систем уже находятся под давлением."],
      ["Управляемый пик нагрузки", "Система напряжена, но согласованные действия начинают менять траекторию."],
      ["Фаза стабилизации", "Некоторые воздействия сохраняются, но траектория больше не ускоряется."],
      ["Долгий горизонт восстановления", "Климат остается измененным, но самая опасная эскалация ограничена."],
      ["Мир медленного восстановления", "Прошлый ущерб сохраняется, но давление на систему ниже, чем в более жестких сценариях."]
    ],
    objective: [
      ["Стабильная базовая линия", "Это визуальная и числовая базовая линия для последующей симуляции."],
      ["Ранний сигнал потепления", "Система начинает нагреваться, но крупнейшие изменения еще впереди."],
      ["Потепление ясно видно", "Потеря льда, стресс экосистем и нагрев океана становятся более измеримыми."],
      ["Предупреждение текущей эпохи", "Климатическая система уже находится под устойчивым давлением человека."],
      ["Нарастающая нестабильность", "Несколько рисков растут вместе: жара, дефицит воды, потеря экосистем и нарушение океана."],
      ["Фаза накапливающегося ущерба", "Мир сталкивается с более сильными каскадными эффектами и растущими пределами адаптации."],
      ["Глубокий стресс системы", "Несколько земных систем находятся под сильным давлением, а восстановление замедляется."],
      ["Долгий хвост ущерба", "Даже если потепление позже замедлится, последствия останутся закрепленными надолго."]
    ],
    high: [
      ["Стабильная базовая линия", "Базовая линия выглядит спокойной, но последующие десятилетия резко расходятся в этом сценарии."],
      ["Начало сигнала потепления", "Климатический тренд начинается похоже, прежде чем позже ускориться сильнее."],
      ["Начало ускорения", "Этот путь начинает заметнее отделяться от более безопасных вариантов будущего."],
      ["Предупреждение текущей эпохи", "Настоящее становится стартовой точкой более быстрой дестабилизации."],
      ["Крупная дестабилизация идет", "Жара, потеря льда и стресс циркуляции усиливаются вместе."],
      ["Фаза каскадного риска", "Обратные связи и пороги становится намного сложнее контролировать."],
      ["Экстремальное нарушение системы", "Несколько систем подталкиваются близко к крупным порогам или за них."],
      ["Укоренившийся мир высокого риска", "Климат остается крайне нестабильным, с долгосрочными глобальными последствиями."]
    ]
  },
  hi: {
    best: [
      ["स्थिर आधार रेखा", "बाद के दशकों की तुलना में मानव-जनित गर्माहट का संकेत अभी कम है."],
      ["प्रारंभिक गर्माहट संकेत", "जलवायु प्रवृत्ति दिखाई देने लगी है, लेकिन अभी अपेक्षाकृत सीमित है."],
      ["गर्माहट दिखाई देने लगी", "बर्फ, समुद्र स्तर और पारिस्थितिक तंत्र अधिक साफ तनाव दिखाने लगते हैं."],
      ["वर्तमान युग की चेतावनी", "मजबूत कार्रवाई अभी भी संभव है, लेकिन कई प्रणालियां पहले से दबाव में हैं."],
      ["संभाला गया चरम दबाव", "प्रणाली तनाव में है, लेकिन समन्वित कार्रवाई वक्र को मोड़ना शुरू करती है."],
      ["स्थिरीकरण चरण", "कुछ प्रभाव बने रहते हैं, लेकिन मार्ग अब तेज नहीं हो रहा."],
      ["लंबा पुनर्प्राप्ति क्षितिज", "जलवायु बदली रहती है, लेकिन सबसे खतरनाक वृद्धि सीमित हो जाती है."],
      ["धीमी मरम्मत वाली दुनिया", "पिछला नुकसान बना रहता है, लेकिन प्रणाली पर दबाव कठोर भविष्य की तुलना में कम है."]
    ],
    objective: [
      ["स्थिर आधार रेखा", "यह बाद की सिमुलेशन के लिए दृश्य और डेटा आधार रेखा है."],
      ["प्रारंभिक गर्माहट संकेत", "प्रणाली गर्म होना शुरू करती है, लेकिन सबसे बड़े बदलाव अभी आगे हैं."],
      ["गर्माहट साफ दिखाई देती है", "बर्फ की हानि, पारिस्थितिक तनाव और महासागर की गर्मी अधिक मापनीय हो रही है."],
      ["वर्तमान युग की चेतावनी", "जलवायु प्रणाली पहले से ही स्थायी मानव दबाव में है."],
      ["बढ़ती अस्थिरता", "कई जोखिम साथ बढ़ते हैं: गर्मी, जल तनाव, पारिस्थितिकी हानि और महासागर व्यवधान."],
      ["संयुक्त क्षति चरण", "दुनिया मजबूत शृंखलाबद्ध प्रभावों और बढ़ती अनुकूलन सीमाओं का सामना करती है."],
      ["गहरा प्रणाली तनाव", "कई पृथ्वी प्रणालियां तीव्र दबाव में हैं और पुनर्प्राप्ति धीमी हो जाती है."],
      ["दीर्घकालिक क्षति", "यदि बाद में गर्माहट धीमी भी हो, तो प्रणालीगत प्रभाव लंबे समय तक बंद रहते हैं."]
    ],
    high: [
      ["स्थिर आधार रेखा", "आधार रेखा शांत दिखती है, लेकिन इस परिदृश्य में बाद के दशक तेजी से अलग हो जाते हैं."],
      ["गर्माहट संकेत शुरू", "जलवायु प्रवृत्ति समान रूप से शुरू होती है, फिर बाद में तेज त्वरण आता है."],
      ["त्वरण शुरू", "यह मार्ग सुरक्षित भविष्य से अधिक साफ अलग होना शुरू करता है."],
      ["वर्तमान युग की चेतावनी", "वर्तमान तेज अस्थिरता का प्रारंभिक बिंदु बन जाता है."],
      ["बड़ी अस्थिरता जारी", "गर्मी, बर्फ हानि और परिसंचरण तनाव साथ-साथ तेज होते हैं."],
      ["शृंखलाबद्ध जोखिम चरण", "फीडबैक और सीमाएं संभालना बहुत कठिन हो जाता है."],
      ["अत्यधिक प्रणाली व्यवधान", "कई प्रणालियां बड़े सीमांतों के पास या उनके पार धकेली जाती हैं."],
      ["स्थायी उच्च-जोखिम दुनिया", "जलवायु लंबे समय तक चलने वाले वैश्विक परिणामों के साथ अत्यधिक अस्थिर रहती है."]
    ]
  },
  ar: {
    best: [
      ["خط أساس مستقر", "لا تزال إشارة الاحترار البشري منخفضة مقارنة بالعقود اللاحقة."],
      ["إشارة احترار مبكرة", "أصبح اتجاه المناخ قابلا للرصد، لكنه لا يزال محدودا نسبيا."],
      ["الاحترار يصبح مرئيا", "يبدأ الجليد ومستوى البحر والنظم البيئية بإظهار ضغط أوضح."],
      ["تحذير العصر الحالي", "لا يزال العمل القوي ممكنا، لكن عدة أنظمة واقعة بالفعل تحت الضغط."],
      ["ذروة ضغط تحت الإدارة", "النظام متوتر، لكن العمل المنسق يبدأ في ثني المنحنى."],
      ["مرحلة الاستقرار", "تستمر بعض الآثار، لكن المسار لم يعد يتسارع."],
      ["أفق تعاف طويل", "يبقى المناخ متغيرا، لكن أخطر تصعيد يصبح محدودا."],
      ["عالم إصلاح بطيء", "يبقى الضرر السابق، لكن ضغط النظام أقل مما هو عليه في مستقبلات أقسى."]
    ],
    objective: [
      ["خط أساس مستقر", "هذا هو خط الأساس البصري والبياني للمحاكاة اللاحقة."],
      ["إشارة احترار مبكرة", "يبدأ النظام في الاحترار، لكن أكبر التغيرات ما زالت أمامنا."],
      ["احترار واضح للعيان", "يصبح فقدان الجليد وضغط النظم البيئية واحترار المحيط أكثر قابلية للقياس."],
      ["تحذير العصر الحالي", "النظام المناخي واقع بالفعل تحت ضغط بشري مستمر."],
      ["عدم استقرار متصاعد", "تنمو عدة مخاطر معا: الحرارة، ضغط المياه، فقدان النظم البيئية واضطراب المحيط."],
      ["مرحلة ضرر متراكب", "يواجه العالم آثارا متسلسلة أقوى وحدودا متزايدة للتكيف."],
      ["ضغط عميق على النظام", "عدة أنظمة أرضية تحت ضغط شديد، والتعافي يصبح أبطأ."],
      ["ضرر طويل الأمد", "حتى إذا تباطأ الاحترار لاحقا، تبقى الآثار النظامية مثبتة لفترة طويلة."]
    ],
    high: [
      ["خط أساس مستقر", "يبدو خط الأساس هادئا، لكن العقود اللاحقة تنحرف بشدة في هذا السيناريو."],
      ["بداية إشارة الاحترار", "يبدأ اتجاه المناخ بطريقة مشابهة، قبل تسارع أشد لاحقا."],
      ["بداية التسارع", "يبدأ هذا المسار في الابتعاد بوضوح أكبر عن مستقبلات أكثر أمانا."],
      ["تحذير العصر الحالي", "يصبح الحاضر نقطة انطلاق لزعزعة استقرار أسرع."],
      ["زعزعة كبرى جارية", "تشتد الحرارة وفقدان الجليد وضغط الدوران معا."],
      ["مرحلة خطر متسلسل", "تصبح التغذيات الراجعة والعتبات أصعب بكثير في الإدارة."],
      ["اضطراب نظامي شديد", "تدفع عدة أنظمة قرب عتبات كبرى أو إلى ما بعدها."],
      ["عالم عالي المخاطر راسخ", "يبقى المناخ شديد الاضطراب، مع عواقب عالمية طويلة الأمد."]
    ]
  },
  zh: {
    best: [
      ["稳定基线", "与后来的几十年相比，人类造成的变暖信号仍然较低。"],
      ["早期变暖信号", "气候趋势已经可以探测到，但仍然相对有限。"],
      ["变暖开始显现", "冰层、海平面和生态系统开始显示更清晰的压力。"],
      ["当前时代警告", "强有力的行动仍然可能，但多个系统已经承受压力。"],
      ["受控峰值压力", "系统处于压力之下，但协调行动开始让曲线转向。"],
      ["稳定阶段", "一些影响仍然存在，但轨迹不再加速。"],
      ["长期恢复前景", "气候仍被改变，但最危险的升级得到限制。"],
      ["缓慢修复的世界", "过去的损害仍然存在，但系统压力低于更严峻的未来。"]
    ],
    objective: [
      ["稳定基线", "这是后续模拟的视觉和数据基线。"],
      ["早期变暖信号", "系统开始变暖，但最大的变化仍在前方。"],
      ["变暖清晰可见", "冰损失、生态系统压力和海洋升温变得更可测量。"],
      ["当前时代警告", "气候系统已经承受持续的人类压力。"],
      ["不稳定性升级", "多种风险一起增长：高温、水压力、生态系统损失和海洋扰动。"],
      ["复合损害阶段", "世界面临更强的连锁效应和不断上升的适应极限。"],
      ["深层系统压力", "多个地球系统承受强烈压力，恢复变得更慢。"],
      ["长尾损害", "即使之后变暖放缓，系统影响也会长期锁定。"]
    ],
    high: [
      ["稳定基线", "基线看似平静，但在此情景下后来的几十年会急剧分化。"],
      ["变暖信号开始", "气候趋势起初相似，随后出现更强的加速。"],
      ["加速开始", "这条路径开始更清楚地偏离较安全的未来。"],
      ["当前时代警告", "当下成为更快速失稳的起点。"],
      ["重大失稳正在发生", "高温、冰损失和环流压力共同加剧。"],
      ["级联风险阶段", "反馈和阈值变得更加难以管理。"],
      ["极端系统扰动", "多个系统被推近或推过主要阈值。"],
      ["根深蒂固的高风险世界", "气候仍然高度不稳定，并带来长期全球后果。"]
    ]
  }
};

function normalizeLanguageCode(code = "") {
  return String(code || "en").split("-")[0].toLowerCase();
}

export function getFeverWarmingTranslation(scenario, year, langCode = "en") {
  const normalizedLang = normalizeLanguageCode(langCode);
  const langCatalog = FEVER_WARMING_TRANSLATIONS[normalizedLang];
  const yearIndex = YEARS.indexOf(Number(year));

  if (!langCatalog || yearIndex === -1) return null;

  const row = langCatalog?.[scenario]?.[yearIndex];
  if (!row) return null;

  return {
    title: row[0],
    message: row[1],
    language: normalizedLang
  };
}
