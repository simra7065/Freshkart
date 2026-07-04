# FreshKart

A grocery delivery web app for Deoband, Saharanpur, connected to Supabase.

## Deploy this for free

1. Create a new GitHub repository (e.g. `freshkart`)
2. Upload all files in this folder to that repository (keep the folder structure — `src/` stays a folder)
3. Go to vercel.com, sign in, click "Add New Project"
4. Import your `freshkart` GitHub repo
5. Leave all settings as default (Vercel auto-detects Vite) and click Deploy
6. In 1-2 minutes you'll get a live URL like `freshkart.vercel.app` — that's your real, working store

## Notes

- Supabase URL and anon key are already set in `src/App.jsx`
- Admin login uses the real Supabase Auth user you created
- Customer login is name + phone (no OTP) — see chat history for how to add real OTP later
