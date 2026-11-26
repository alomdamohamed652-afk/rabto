# اختبارات E2E / E2E tests

## العربية

**للاختبار المحلي المعزول فقط.** المتطلبات:
- PostgreSQL 16 مثبت محليًا، مع ضبط `PGBIN` على مجلد ملفات التنفيذ الذي يحتوي `initdb` و`pg_ctl` و`createdb` و`psql`.
- Node.js واعتماديات المشروع.
- تشغيل `npm run build` قبل الاختبار.

التشغيل من جذر المستودع:

```bash
RABTO_E2E=1 PGBIN=/path/to/postgresql/16/bin bash scripts/e2e/run.sh flow2.mjs
```

يرفض السكربت التشغيل ما لم تكن `RABTO_E2E=1`. ينشئ مجلدًا مؤقتًا وقاعدة PostgreSQL محلية جديدة يستمع خادمها على `127.0.0.1)، ثم يوقف العمليات التي بدأها ويزيل مجلد الاختبار عند الانتهاء. لا يتصل ولا يلمس أي قاعدة بيانات أخرى. **ممنوع تشغيله باستخدام `DATABASE_URL` حقيقي أو على بيانات حقيقية أو بيئة إنتاج.** كلمات المرور وأسرار الجلسات الثابتة مخصصة للاختبار فقط.

## English

**Local, isolated testing only.** Requirements:
- PostgreSQL 16 installed locally. Set `PGBIN` to the directory containing its `initdb`, `pg_ctl`, `createdb`, and `psql` binaries.
- Node.js and the repository dependencies.
- Run `npm run build` before testing.

Run from the repository root:

```bash
RABTO_E2E=1 PGBIN=/path/to/postgresql/16/bin bash scripts/e2e/run.sh flow2.mjs
```

The runner refuses to start unless `RABTO_E2E=1` is set. It creates a temporary directory and a fresh local PostgreSQL instance bound to `127.0.0.1), then stops only the processes it started and removes the temporary test directory. It does not connect to or touch any other database. **Never run it with a real `DATABASE_URL`, real data, or against production.** Fixed passwords and session secrets are test-only fixtures.
