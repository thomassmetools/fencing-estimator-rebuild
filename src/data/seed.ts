import type { ContractorRecord } from "../types";

export const seedContractors: ContractorRecord[] = [
  {
    id: "contractor-tasman",
    slug: "tasman-fencing",
    measurementSystem: "metric",
    branding: {
      primaryColor: "#1d4f41",
      accentColor: "#d8a64f",
      heroLabel: "Outdoor quoting made simple",
      introText:
        "Measure the site, choose your preferred fence style, and copy a clean enquiry message ready to send.",
    },
    contact: {
      businessName: "Tasman Fencing Co.",
      phone: "+64 21 555 0199",
      email: "quotes@tasmanfencing.co.nz",
      website: "https://tasmanfencing.example",
      facebookUrl: "https://facebook.com/tasmanfencing",
    },
    resultTemplate: {
      openingLine: "Hi Tasman Fencing, I would like a quote for the following project:",
      closingLine: "Please get in touch to confirm pricing, site access, and install timing.",
      includePricingDisclaimer: true,
    },
    products: [
      {
        id: "prod-aluminium-slat",
        name: "Aluminium slat fence",
        description: "Modern horizontal slats with powder-coated finish.",
        unit: "lineal metre",
        basePrice: 185,
        isFeatured: true,
      },
      {
        id: "prod-pool-panel",
        name: "Pool fencing panel",
        description: "Compliant black tubular pool fencing.",
        unit: "lineal metre",
        basePrice: 162,
      },
      {
        id: "prod-gate-single",
        name: "Single pedestrian gate",
        description: "Matching gate hardware and latch set included.",
        unit: "each",
        basePrice: 690,
      },
    ],
  },
  {
    id: "contractor-boundaryline",
    slug: "boundaryline-rural",
    measurementSystem: "metric",
    branding: {
      primaryColor: "#55331d",
      accentColor: "#9db86f",
      heroLabel: "Fast rural fence planning",
      introText:
        "Built for Facebook traffic and website embeds so rural customers can self-measure before they call.",
    },
    contact: {
      businessName: "Boundaryline Rural",
      phone: "+64 27 444 8821",
      email: "hello@boundarylinerural.co.nz",
      website: "https://boundaryline.example",
      facebookUrl: "https://facebook.com/boundaryline",
    },
    resultTemplate: {
      openingLine: "Hello Boundaryline Rural, here is my fencing estimate request:",
      closingLine: "Let me know the next step and whether you need site photos as well.",
      includePricingDisclaimer: true,
    },
    products: [
      {
        id: "prod-post-wire",
        name: "Post and wire",
        description: "Traditional rural fencing with treated timber posts.",
        unit: "lineal metre",
        basePrice: 92,
        isFeatured: true,
      },
      {
        id: "prod-deer-fence",
        name: "Deer fencing",
        description: "High-tensile netting for lifestyle blocks and grazing paddocks.",
        unit: "lineal metre",
        basePrice: 124,
      },
      {
        id: "prod-farm-gate",
        name: "Farm gate",
        description: "Heavy-duty galvanised swing gate.",
        unit: "each",
        basePrice: 540,
      },
    ],
  },
];
