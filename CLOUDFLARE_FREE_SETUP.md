# Cloudflare Free Data & Image Store Setup (Zero Google Popup · 100% Free)

এই সিস্টেম চালু করলে আপনার **Admin Panel (`sabbir@sqa2026`)** আনলক করলেই সরাসরি ছবি, প্রোফাইল, প্রজেক্ট, ব্লগ ও ভিজিটিং কার্ড **Cloudflare Free Server**-এ আপলোড ও সেভ হবে। মোবাইল বা অন্য কোনো ব্রাউজার থেকে সাইট খুললেই সাথে সাথে আপডেট দেখা যাবে—**কোনো Google Login পপআপ বা Domain Whitelist লাগবে না।**

---

## সবচেয়ে সহজ উপায় (Method A — Direct Cloudflare KV, কোনো Worker কোড বা ক্রেডিট কার্ড লাগবে না)

Cloudflare Free Plan-এ প্রতিদিন **100,000 Reads**, **1,000 Writes**, এবং **1 GB Free Storage** পাওয়া যায় (প্রতি ছবি/ডাটা সর্বোচ্চ 25 MiB)।

### Step 1: Cloudflare-এ একটি ফ্রি KV Namespace তৈরি করুন
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) এ ফ্রি লগইন করুন।
2. বাম মেনু থেকে **Storage & Databases** > **KV** > **Create** বাটনে ক্লিক করুন।
3. নাম দিন `sabbir-portfolio-store` এবং তৈরি করুন।
4. এখান থেকে **Namespace ID** কপি করুন (যেমন: `a1b2c3d4...`)।
5. ডান পাশের Sidebar থেকে আপনার **Account ID** কপি করুন।

### Step 2: একটি KV API Token তৈরি করুন
1. ডান উপরের Profile Icon > **My Profile** > **API Tokens** > **Create Token**।
2. একদম নিচে **Create Custom Token** সিলেক্ট করুন:
   - **Token name**: `Portfolio KV Sync`
   - **Permissions**: `Account` > `Workers KV Storage` > `Edit`
3. **Continue to summary** > **Create Token** ক্লিক করে Token-টি কপি করুন।

### Step 3: Vercel / Server Environment Variables-এ যোগ করুন
[Vercel Project Settings > Environment Variables](https://vercel.com/) এ এই ৩টি Variable যোগ করে **Redeploy** করুন:

```env
CLOUDFLARE_ACCOUNT_ID=আপনার_Account_ID
CLOUDFLARE_KV_NAMESPACE_ID=আপনার_KV_Namespace_ID
CLOUDFLARE_API_TOKEN=আপনার_KV_API_Token
```

---

## বিকল্প উপায় (Method B — Cloudflare Edge Worker + KV/R2)

আপনি চাইলে `cloudflare/worker.js` ফাইলটি কপি করে Cloudflare **Workers & Pages > Create Worker**-এ পেস্ট করে Deploy করতে পারেন:
1. Worker Settings > **Bindings** > `PORTFOLIO_KV` (KV Namespace) যোগ করুন (ইচ্ছা হলে R2 Bucket `PORTFOLIO_MEDIA` ও দিতে পারেন)।
2. Worker Variables-এ `SYNC_SECRET` নামে একটি গোপন পাসওয়ার্ড সেট করুন।
3. Vercel / Server Environment Variables-এ শুধু এই ২টি যোগ করুন:
```env
CLOUDFLARE_WORKER_URL=https://your-worker.your-name.workers.dev
CLOUDFLARE_SYNC_SECRET=আপনার_সেট_করা_SYNC_SECRET
```
