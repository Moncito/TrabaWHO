import type { ServiceCode } from "./schemas";

/**
 * "Habang hinihintay ang worker" first-aid steps for the restricted chatbot.
 * TEAM-WRITTEN, never AI-generated: the AI only classifies the message (same intake pipeline),
 * code picks these steps. They only make things safe until a professional arrives; no DIY repairs.
 * Hazard notes (gas, sparks, flooding...) come from catalog.json and are shown before these.
 */
export const FIRST_AID_STEPS: Record<ServiceCode, string[]> = {
  PLUMBING: [
    "Isara ang maliit na valve sa ilalim ng lababo o sa likod ng inidoro (pihitin pakanan).",
    "Kung malakas ang tagas o hindi mo makita ang valve, isara ang main valve ng tubig malapit sa metro.",
    "Lagyan ng timba o basahan ang tumutulo, at punasan ang sahig para walang madulas.",
    "Huwag munang gumamit ng kemikal na pang-bara o ng gripo/inidoro na may problema.",
  ],
  ELECTRICAL: [
    "Huwag hawakan ang sirang saksakan, switch o kawad.",
    "Tanggalin sa saksakan ang mga appliance na nakakabit dito, gamit ang tuyong kamay at hawak sa plug.",
    "Kung may init, amoy sunog o spark, patayin ang breaker ng bahaging iyon (o ang main breaker) kung ligtas itong abutin.",
    "Huwag paulit-ulit i-on ang breaker na nagti-trip.",
  ],
  CARPENTRY: [
    "Lumayo sa bahaging maluwag, nakalaylay o bumibigay, lalo na ang mga bata.",
    "Alisin ang mabibigat na gamit sa ibabaw o ilalim ng sirang bahagi.",
    "Kung pinto o kandado ang sira, i-secure muna nang pansamantala; huwag pilitin buksan o isara.",
  ],
  AIRCON: [
    "Patayin ang aircon sa remote, at tanggalin sa saksakan o patayin ang breaker nito.",
    "Kung tumutulo ang tubig, lagyan ng timba o tuwalya sa ilalim at ilayo ang mga gamit.",
    "Huwag buksan ang loob ng unit o galawin ang freon at mga tubo.",
  ],
  WELDING: [
    "Lumayo sa sirang gate, grills o railing; huwag itong sandalan o akyatin.",
    "Kung nasa daanan, lagyan ng harang o babala para walang masaktan.",
    "Huwag subukang itali ng alambre o ihinang mag-isa.",
  ],
};

export const FIRST_AID_DISCLAIMER_TL =
  "Paalala: AI ang tumukoy sa problema at maaari itong magkamali. Ang mga hakbang na ito ay para lang manatiling ligtas habang hinihintay ang propesyonal; huwag subukang ayusin mag-isa.";

export const FIRST_AID_OFF_TOPIC_TL =
  'Ang kaya ko lang ay first-aid habang hinihintay ang worker para sa tubo, kuryente, kahoy, aircon at bakal. Ilarawan ang sira, hal. "tumutulo ang tubo sa ilalim ng lababo".';

export const FIRST_AID_GREETING_TL =
  "Ano ang nangyayari? Ilarawan ang sira at sasabihin ko kung ano ang ligtas gawin habang hinihintay ang worker.";

export function firstAidFor(service: ServiceCode): string[] {
  return FIRST_AID_STEPS[service];
}
