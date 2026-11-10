// Dated policy records. These never supply values to scientific normalization.
export const VERIFIED_AT = '2026-11-10';
const unfccc = (path, locator) => ({name:'UNFCCC',url:`https://unfccc.int/${path}`,locator,checkedAt:VERIFIED_AT});
export const CALENDAR_SOURCE=unfccc('news/the-cdm-executive-board-agrees-on-temporary-measures-to-address-cop26-postponement','2020 conference postponed to November 2021');
export const CONFERENCES = [
  {id:'cop21',number:21,year:2015,location:'Paris, France',start:'2015-11-30',end:'2015-12-11',adoptedOn:'2015-12-12',
    agreements:'Paris Agreement: successive nationally determined contributions (NDCs), adaptation, finance and a transparency framework.',
    commitments:'Hold warming well below 2°C and pursue 1.5°C above preindustrial levels; communicate successive NDCs every five years. These are policy objectives, not measured cooling.',
    implementation:'The Agreement entered into force on 4 November 2016. Later COPs developed its reporting and implementation rules.',
    gaps:'A treaty and submitted NDCs do not establish delivery or compliance with the temperature goal.',
    sources:[unfccc('event/cop-21','Scheduled session dates'),unfccc('process-and-meetings/the-paris-agreement','Adoption, temperature goals and entry into force')]},
  {id:'cop22',number:22,year:2016,location:'Marrakech, Morocco',start:'2016-11-07',end:'2016-11-18',
    agreements:'Marrakech Action Proclamation reaffirmed the Paris direction and the shift toward implementation.',
    commitments:'Implementation and support commitments; no new universal numerical emissions-reduction target is recorded here.',
    implementation:'Work on the Paris implementation guidelines continued; the rulebook was subsequently adopted at Katowice in 2018.',
    gaps:'A political proclamation does not quantify actual emissions reductions or delivered finance.',
    sources:[unfccc('fr/node/611275','Marrakech session, 7–18 November 2016'),unfccc('news/marrakech-action-proclamation-expresses-irreversible-momentum-on-climate','17 November proclamation'),unfccc('process-and-meetings/the-paris-agreement/katowice-climate-package','Negotiations began in 2016; 2018 implementation guidelines')]},
  {id:'cop23',number:23,year:2017,location:'Bonn, Germany · Fiji presidency',start:'2017-11-06',end:'2017-11-17',
    agreements:'Fiji Momentum for Implementation launched the Talanoa Dialogue to inform stronger climate action.',
    commitments:'The dialogue was to run during 2018, informing NDC ambition. No common quantified emissions cut was newly adopted here.',
    implementation:'The Talanoa Dialogue began in January 2018 under decision 1/CP.23 and informed the following conference.',
    gaps:'Participation in a dialogue is a process achievement, not a verified environmental improvement.',
    sources:[unfccc('conference/un-climate-change-conference-november-2017','Bonn session, 6–17 November 2017'),unfccc('process-and-meetings/the-paris-agreement/the-paris-agreement/2018-talanoa-dialogue-platform','Decision 1/CP.23, paragraphs 10–11 and Annex II')]},
  {id:'cop24',number:24,year:2018,location:'Katowice, Poland',start:'2018-12-02',end:'2018-12-14',
    agreements:'Katowice climate package established detailed Paris implementation and transparency guidelines.',
    commitments:'Reporting, technical review and tracking of NDC implementation; no new common physical boundary threshold.',
    implementation:'Common reporting and review procedures were adopted. This is documented institutional implementation, not an emissions outcome.',
    gaps:'Accounting rules require subsequent national implementation; the Article 6 rules were not all resolved at this conference.',
    sources:[unfccc('conference/katowice-climate-change-conference-december-2018','Scheduled session, 2–14 December 2018'),unfccc('process-and-meetings/the-paris-agreement/katowice-climate-package','Transparency and implementation guidelines')]},
  {id:'cop25',number:25,year:2019,location:'Madrid, Spain · Chile presidency',start:'2019-12-02',end:'2019-12-13',
    agreements:'Chile–Madrid Time for Action; the Santiago Network was created for technical assistance on loss and damage.',
    commitments:'Strengthen ambition and support. No new collective quantified emissions target is recorded here.',
    implementation:'Creation of the Santiago Network is an institutional outcome; assistance delivery must be assessed separately.',
    gaps:'Article 6 negotiations remained unresolved; network creation is not proof of funded recovery or lower planetary pressure.',
    sources:[unfccc('cop25','Session dates and adopted decisions'),{name:'Chile Ministry of Environment · COP25',url:'https://cop25.mma.gob.cl/objetivos/',locator:'Santiago Network and Article 6',checkedAt:VERIFIED_AT}]},
  {id:'cop26',number:26,year:2021,location:'Glasgow, United Kingdom',start:'2021-10-31',end:'2021-11-12',adoptedOn:'2021-11-13',
    agreements:'Glasgow Climate Pact: strengthen action this decade; phase down unabated coal and phase out inefficient fossil-fuel subsidies.',
    commitments:'Urged developed countries to at least double collective adaptation finance from 2019 levels by 2025.',
    implementation:'The Glasgow–Sharm el-Sheikh adaptation work programme was established; Article 6 implementation rules were agreed.',
    gaps:'Agreed rules and finance pledges are not disbursements. The doubling goal needs a separate finance-delivery audit.',
    sources:[unfccc('cop26','Conference and Glasgow Pact'),unfccc('process-and-meetings/the-paris-agreement/the-glasgow-climate-pact/cop26-outcomes-finance-for-climate-adaptation','2019 baseline, 2025 doubling call and work programme')]},
  {id:'cop27',number:27,year:2022,location:'Sharm el-Sheikh, Egypt',start:'2022-11-06',end:'2022-11-20',
    agreements:'Established new funding arrangements, including a fund for responding to loss and damage in vulnerable developing countries.',
    commitments:'A funding mechanism was agreed; the decision is not a verified sum paid to affected communities.',
    implementation:'A transitional process was established to operationalize the fund; COP28 subsequently adopted operational arrangements.',
    gaps:'Fund governance, actual contributions and delivery need separate tracking; no global environmental recovery can be inferred.',
    sources:[unfccc('cop27','Dates'),unfccc('news/cop27-reaches-breakthrough-agreement-on-new-loss-and-damage-fund-for-vulnerable-countries','20 November 2022 outcome')]},
  {id:'cop28',number:28,year:2023,location:'Dubai, United Arab Emirates',start:'2023-11-30',end:'2023-12-12',adoptedOn:'2023-12-13',
    agreements:'First global stocktake called for transitioning away from fossil fuels in energy systems in a just, orderly and equitable manner.',
    commitments:'Contribute to tripling global renewable-energy capacity and doubling the global average annual rate of energy-efficiency improvements by 2030.',
    implementation:'The first global stocktake concluded and loss-and-damage fund arrangements were operationalized.',
    gaps:'Energy targets and operational arrangements are policy/process achievements. Actual deployment, finance delivery and emissions reductions require monitoring.',
    sources:[unfccc('cop28','First global stocktake and adopted decisions'),{name:'United Nations · COP28',url:'https://www.un.org/en/climatechange/cop28',locator:'Energy goals and loss-and-damage fund',checkedAt:VERIFIED_AT}]},
  {id:'cop29',number:29,year:2024,location:'Baku, Azerbaijan',start:'2024-11-11',end:'2024-11-22',adoptedOn:'2024-11-24',
    agreements:'New collective quantified climate-finance goal and agreement on remaining carbon-market implementation rules.',
    commitments:'At least USD 300 billion annually by 2035, with developed countries taking the lead; wider scaling toward USD 1.3 trillion annually by 2035 from all actors.',
    implementation:'The new finance goal was adopted. The Baku-to-Belém process carried forward the wider finance roadmap.',
    gaps:'Targets are not payments. Adequacy, grant/debt composition and delivery remain distinct from the adopted headline amount.',
    sources:[unfccc('cop29','Scheduled dates and adopted decisions'),{name:'United Nations · COP29',url:'https://www.un.org/en/climatechange/cop29',locator:'24 November conclusion and finance goal',checkedAt:VERIFIED_AT}]},
  {id:'cop30',number:30,year:2025,location:'Belém, Brazil',start:'2025-11-10',end:'2025-11-21',adoptedOn:'2025-11-22',
    agreements:'Belém outcome called for stronger adaptation support and support for workers and communities in a just transition.',
    commitments:'Call for efforts to triple adaptation finance by 2035. No unverified baseline or delivered finance total is substituted for that call.',
    implementation:'The adopted outcome provides a policy basis for implementation; actual finance delivery and environmental effects require later assessment.',
    gaps:'Implementation, adequate finance and the fossil-fuel transition remain outstanding; a negotiated call is not an observed improvement.',
    sources:[unfccc('cop30','Scheduled session dates'),{name:'United Nations · COP30',url:'https://www.un.org/en/climatechange/cop30',locator:'22 November conclusion and support package',checkedAt:VERIFIED_AT},{name:'UN Secretary-General',url:'https://www.un.org/sg/en/content/sg/statements/2025-11-22/statement-the-secretary-general-the-agreement-cop30',locator:'Triple adaptation finance by 2035',checkedAt:VERIFIED_AT}]},
  {id:'cop31',number:31,year:2026,location:'Antalya, Türkiye',start:'2026-11-09',end:'2026-11-20',status:'pending',
    agreements:'Pending official adoption. As of 10 November 2026, the conference is underway.',
    commitments:'Objectives include accelerating implementation and translating prior decisions into measurable action. No final COP31 commitment is claimed.',
    implementation:'The conference has opened; final adopted decisions and subsequent implementation remain pending.',
    gaps:'Do not treat agenda items, announcements, drafts or projections as adopted outcomes or verified environmental gains.',
    sources:[unfccc('cop31','Dates, location and session documents'),{name:'UNFCCC Global Climate Action Portal',url:'https://climateaction.unfccc.int/CopsAndSummits/COP31',locator:'Action Agenda objectives',checkedAt:VERIFIED_AT}]}
].map(record=>Object.freeze({status:'adopted',checkedAt:VERIFIED_AT,...record}));

// Independent observations, not COP results and not copies of PHC assessment data.
export const OBSERVATIONS = Object.freeze([
  {id:'antarctic-ozone-seasonal-area',indicatorId:'stratospheric_ozone_depletion',kind:'measurement',scope:'Antarctic region',
    label:'Antarctic ozone-hole seasonal mean area',method:'NASA Ozone Watch · mean area, 7 September–13 October',direction:'lower',
    previous:{value:19.6,year:2024,unit:'million km²',period:'2024-09-07/2024-10-13'},latest:{value:18.7,year:2025,unit:'million km²',period:'2025-09-07/2025-10-13'},
    comparable:true,globalBoundaryMeasurement:false,attributableToCop:false,checkedAt:VERIFIED_AT,
    source:{name:'NASA Ozone Watch',url:'https://ozonewatch.gsfc.nasa.gov/statistics/annual_data.html',locator:'Second table: seasonal means, 2024 and 2025; updated 3 November 2026'},
    uncertainty:'Published values rounded to 0.1 million km²; no uncertainty interval in this table. One-year change is influenced by meteorology and does not establish a long-term trend. Regional area is not global ozone column (DU). The Montreal Protocol is a separate treaty; no COP attribution. 2026 seasonal values were not available in the verified table.'},
  {id:'global-co2-2025',indicatorId:'climate_change__co2_concentration',kind:'measurement',scope:'Global',label:'Global surface CO₂ concentration',
    method:'WMO Global Atmosphere Watch annual global mean',direction:'lower',previous:null,latest:{value:426.8,year:2025,unit:'ppm',period:'2025 annual mean'},
    comparable:false,globalBoundaryMeasurement:true,attributableToCop:false,checkedAt:VERIFIED_AT,
    source:{name:'WMO · Greenhouse Gas Bulletin release',url:'https://public.wmo.int/news/media-centre/greenhouse-gas-levels-once-again-reach-record-high',locator:'27 October 2026 press release; 2025 global mean'},
    uncertainty:'Record-high concentration, not an improvement. No comparison is manufactured across different report revisions. This separate WMO context value does not replace the existing PHC snapshot.'}
]);

export function progressComparison(record){
  const a=record.previous,b=record.latest;
  const comparable=record.kind==='measurement'&&record.comparable===true&&!!record.method&&!!record.scope&&a&&b&&
    Number.isFinite(a.value)&&Number.isFinite(b.value)&&a.unit===b.unit&&a.year<b.year;
  if(!comparable)return {comparable:false,improved:false,difference:null};
  const difference=Number((b.value-a.value).toFixed(6));
  return {comparable:true,improved:record.direction==='lower'?difference<0:record.direction==='higher'?difference>0:false,difference};
}
