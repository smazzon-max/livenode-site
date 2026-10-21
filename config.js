/* LiveNode · impostazioni del sito (le sole cose da modificare) */
const CFG = {
  supabaseUrl: "https://alwxnejtzbmcwapbyvda.supabase.co",
  // chiave "anon" (pubblica per natura: la sicurezza è nelle regole del database)
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3huZWp0emJtY3dhcGJ5dmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjI0OTksImV4cCI6MjEwNzI5ODQ5OX0.LavHlVYDt53bCrkDlcxRdm5OiW7kYdSTrXCeRBxvhzc",
  // dove si scarica l'app (da cambiare quando carichi il DMG)
  dmgUrl: "https://livenode-software.com/download/LiveNode.dmg",
  // prezzi mostrati sul sito: devono coincidere con quelli creati in Stripe
  plans: [
    { key: "cloud_start",  name: "Cloud Start",  gb: 50,   price: "9 €",  note: "Per provare e per piccoli eventi" },
    { key: "cloud_pro",    name: "Cloud Pro",    gb: 250,  price: "29 €", note: "Per chi trasmette ogni settimana" },
    { key: "cloud_studio", name: "Cloud Studio", gb: 1000, price: "79 €", note: "Per studi e produzioni" },
  ],
};
CFG.functions = CFG.supabaseUrl + "/functions/v1";
