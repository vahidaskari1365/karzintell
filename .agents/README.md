<div dir="rtl">

# Agent Skills — کارزینتل

این پوشه شامل **67 skill** برای AI agent هاست که از [skills.sh](https://www.skills.sh/) نصب شده‌اند.

## لیست Skills

### Anthropic Skills (مهارت‌های رسمی Anthropic)

| Skill | توضیح |
|---|---|
| `academy-guide` | راهنمای آکادمیک |
| `algorithmic-art` | هنر الگوریتمی |
| `brand-guidelines` | راهنمای برند |
| `canvas-design` | طراحی canvas |
| `claude-api` | راهنمای API کلاد |
| `discernment-nudge` | nudge تشخیص |
| `doc-coauthoring` | هم‌نویسی سند |
| `frontend-design` | طراحی فرانت‌اَند |
| `internal-comms` | ارتباطات داخلی |
| `mcp-builder` | سازنده MCP |
| `skill-creator` | سازنده skill |
| `slack-gif-creator` | سازنده GIF اسلک |
| `theme-factory` | کارخانه theme |
| `web-artifacts-builder` | سازنده artifacts وب |
| `webapp-testing` | تست وب‌اَپ |
| `writing-guidelines` | راهنمای نوشتن |
| `template-skill` | قالب skill |

### Office Document Skills

| Skill | توضیح |
|---|---|
| `docx` | ایجاد/ویرایش Word |
| `pdf` | ایجاد/ویرایش PDF |
| `pptx` | ایجاد/ویرایش PowerPoint |
| `xlsx` | ایجاد/ویرایش Excel |

### Vercel Labs Skills (مهارت‌های Vercel)

| Skill | توضیح |
|---|---|
| `deploy-to-vercel` | استقرار روی Vercel |
| `vercel-cli-with-tokens` | Vercel CLI با token |
| `vercel-composition-patterns` | الگوهای composition |
| `vercel-optimize` | بهینه‌سازی Vercel |
| `vercel-react-best-practices` | بهترین روش‌های React |
| `vercel-react-native-skills` | React Native |
| `vercel-react-view-transitions` | View Transitions |
| `web-design-guidelines` | راهنمای طراحی وب |
| `writing-guidelines` | راهنمای نوشتن |
| `agent-browser` | مرورگر agent |

### Matt Pocock Skills (مهارت‌های مهندسی)

| Skill | توضیح |
|---|---|
| `ask-matt` | پرسش از متخصص |
| `claude-handoff` | handoff کلاد |
| `code-review` | بازبینی کد |
| `codebase-design` | طراحی codebase |
| `diagnosing-bugs` | تشخیص باگ |
| `domain-modeling` | مدل‌سازی دامنه |
| `git-guardrails-claude-code` | guardrails گیت |
| `grill-me` | grill کردن |
| `grill-with-docs` | grill با مستندات |
| `grilling` | grilling |
| `handoff` | handoff |
| `implement` | پیاده‌سازی |
| `implement-spec` | پیاده‌سازی spec |
| `improve-codebase-architecture` | بهبود معماری codebase |
| `loop-me` | loop کردن |
| `migrate-to-shoehorn` | migration به shoehorn |
| `prototype` | prototype |
| `research` | تحقیق |
| `resolving-merge-conflicts` | حل conflict مرج |
| `retro` | retro |
| `scaffold-exercises` | scaffold تمرینات |
| `setup-matt-pocock-skills` | نصب مهارت‌های مت |
| `setup-pre-commit` | نصب pre-commit |
| `setup-ts-deep-modules` | نصب TS deep modules |
| `tdd` | توسعه تست‌محور |
| `teach` | تدریس |
| `to-questionnaire` | تبدیل به پرسشنامه |
| `to-spec` | تبدیل به spec |
| `to-tickets` | تبدیل به ticket |
| `triage` | triage |
| `wait-what` | wait-what |
| `wayfinder` | wayfinder |
| `wizard` | wizard |
| `writing-beats` | beats نوشتن |
| `writing-for-agents` | نوشتن برای agent |
| `writing-fragments` | fragments نوشتن |
| `writing-shape` | shape نوشتن |

## نصب مجدد

اگر می‌خواهید همه skills را از نو نصب کنید:

```bash
# حذف همه skills
npx skills remove

# نصب از skills-lock.json
npx skills experimental_install
```

برای نصب یک skill جدید:

```bash
npx skills add <owner/repo>
# مثال:
npx skills add anthropics/skills
npx skills add vercel-labs/agent-skills
npx skills add vercel-labs/agent-browser
npx skills add mattpocock/skills
```

## منابع

- [skills.sh](https://www.skills.sh/) — دایرکتوری اصلی
- [GitHub: vercel-labs/skills](https://github.com/vercel-labs/skills) — CLI اوپن‌سورس
- [Docs](https://www.skills.sh/docs)

## نکات

- این skills برای AI agent ها (Claude, Cursor, Codex, و غیره) طراحی شده‌اند
- فایل `skills-lock.json` در ریشه پروژه، نسخه‌های نصب شده را ردیابی می‌کند
- هر skill در `.agents/skills/<name>/SKILL.md` توضیحات کامل دارد

</div>
