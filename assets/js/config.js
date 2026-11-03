/* ==========================================================================
   AGAM — SITE SETTINGS
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit to change your contact details,
   social links and the enquiry form destination. Every page reads from here.
   ========================================================================== */

window.AGAM = {
  // ---- Identity -----------------------------------------------------------
  name: "Agam",
  legalName: "Agam Interiors Pvt Ltd",
  tagline: "Interior & Build Consultants",
  city: "Chennai",

  // ---- Staff gateway ------------------------------------------------------
  // The private vault is hosted separately (see ../vault/SETUP.md). Paste its
  // HTTPS address here to show a discreet "Staff sign-in" link in the footer.
  // Leave "" to hide the link entirely. Never put the vault inside this site.
  staffPortal: "https://james-arm-finish-paid.trycloudflare.com",

  // ---- Contact ------------------------------------------------------------
  phone: "+91 99401 16073",
  phoneHref: "tel:+919940116073",
  whatsapp: "919940116073",            // digits only, with country code, no +
  email: "agaminterio@gmail.com",

  address: {
    line1: "No. 7/45, Police Office Road",
    line2: "St. Thomas Mount, Chennai 600016",
    mapQuery: "No. 7/45, Police Office Road, St. Thomas Mount, Chennai 600016",
    mapLat: 13.0099013,
    mapLng: 80.198755,
    mapZoom: 17
  },

  hours: [
    ["Monday – Friday", "9:00 am – 7:00 pm"],
    ["Saturday", "9:00 am – 6:00 pm"],
    ["Sunday", "By appointment"]
  ],

  // ---- Enquiry form -------------------------------------------------------
  // Leave empty ("") to use the built-in fallback: the enquiry is handed to
  // WhatsApp with the message pre-filled (best for mobile visitors).
  // To collect enquiries in your inbox, create a free form at
  // https://formspree.io and paste the endpoint here,
  // e.g. "https://formspree.io/f/abcdwxyz".
  formEndpoint: "",

  // ---- Social (leave "" to hide the icon) ---------------------------------
  social: {
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: ""
  }
};
