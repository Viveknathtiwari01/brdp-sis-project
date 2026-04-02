# BRDP SIS - Local Setup / DB Change / Seeding

## 1) Install dependencies

```bash
npm install
```


## 2) Configure Database (MongoDB Atlas..) 

Create/Update `.env` in the project root:

```env
DATABASE_URL="mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_HOST>/<DB_NAME>?retryWrites=true&w=majority"
```

Atlas checklist:
- Allow your IP in **Atlas > Network Access**
- Ensure DB user exists in **Atlas > Database Access**
- URL-encode password if it contains special characters

## 3) When `DATABASE_URL` changes

Regenerate Prisma Client:

```bash
npm run db:generate
```

Restart dev server:

```bash
npm run dev
```

## 4) Seed the database (create admin/demo data)

Run:

```bash
npm run db:seed
```

Seed creates these login credentials:
- System Admin: `admin@brdp.edu` / `Admin@123`
- Demo Admin: `demoadmin@brdp.edu` / `DemoAdmin@123`
- Student: `student@brdp.edu` / `Student@123`

## 5) Common mistakes

- `npm run seed.ts` is not a valid script.
- Use the defined script: `npm run db:seed`
- If login says "Invalid email or password", it usually means:
  - you did not run seed on the current database, or
  - you are pointing to a different DB in `DATABASE_URL`, or
  - you changed DB but didn’t re-seed.
