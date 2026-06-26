# Google Classroom Bridge

This Apps Script web app lets the static admin dashboard create scheduled Google Classroom tasks from a CSV file.

## Setup

1. Create a new project at <https://script.google.com/>.
2. Copy `Code.gs` into the Apps Script editor.
3. Copy `appsscript.json` into **Project Settings > Show "appsscript.json" manifest file in editor**.
4. Enable **Services > Google Classroom API** in Apps Script.
5. In the linked Google Cloud project, enable the **Google Classroom API**.
6. Open **Project Settings > Script properties** and add:
   - `BRIDGE_SECRET`: a long random password used by the admin dashboard.
   - `DASHBOARD_ORIGIN`: optional, comma-separated origins allowed to call the bridge, for example `https://dipccclassroom.github.io,http://127.0.0.1:4173`.
7. Deploy with **Deploy > New deployment > Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone with the link** or the narrowest option that still lets your dashboard load it.
8. Open the Web App URL once and approve the requested permissions.
9. Paste the Web App URL and bridge secret into the admin dashboard Classroom tab.

The deploying Google account must be a teacher in every Classroom course ID you use. Because "Execute as: Me" creates work as the deploying account, keep the Web App URL and `BRIDGE_SECRET` private.

When you change `Code.gs`, create a new Apps Script deployment version or edit the existing deployment to point at the latest version. Otherwise the dashboard will keep calling the old bridge code.

Run `testBridgeSetup()` from the Apps Script editor if you want to confirm script properties are visible. Do not run `handleBridgeRequest()` directly from the editor; it is only called by the dashboard and needs a request payload.

If you set `DASHBOARD_ORIGIN`, use only the origin, not the full admin URL:

```text
https://dipccclassroom.github.io
```

If the dashboard says the response bridge is unavailable, it will submit through a hidden form fallback. That fallback can create Classroom tasks, but the browser cannot read row-level results, so check **Apps Script > Executions** and Classroom before retrying.

## CSV Format

Use these headers:

```csv
title,description,topic,topicId,scheduledAt,dueAt,maxPoints,materialUrl,workType,state,choices
```

Supported columns:

- `title`: required Classroom task title.
- `description`: optional post body/content.
- `topic`: topic name. The bridge reuses an existing matching topic or creates it.
- `topicId`: optional direct Classroom topic ID. If present, it is used instead of `topic`.
- `scheduledAt`: optional ISO date/time, for example `2026-09-01T09:00:00+03:00`. Must be in the future.
- `dueAt`: optional ISO date/time for assignment due date/time.
- `maxPoints`: optional non-negative number.
- `materialUrl`: optional `http://` or `https://` link. Use semicolons for multiple links.
- `workType`: `ASSIGNMENT`, `SHORT_ANSWER_QUESTION`, or `MULTIPLE_CHOICE_QUESTION`.
- `state`: `DRAFT` or `PUBLISHED`. Rows with `scheduledAt` are sent to Classroom as `DRAFT` with `scheduledTime`; Classroom publishes them at the scheduled time.
- `choices`: required for `MULTIPLE_CHOICE_QUESTION`; separate choices with semicolons.

Comma, semicolon, and tab-delimited CSV files are accepted. If a field itself contains the delimiter, wrap it in quotes.

Example:

```csv
title,description,topic,topicId,scheduledAt,dueAt,maxPoints,materialUrl,workType,state,choices
Chapter 1 Reading,Read pages 1-12 and submit notes.,Unit 1,,2026-09-01T09:00:00+03:00,2026-09-05T18:00:00+03:00,10,https://example.com/reading.pdf,ASSIGNMENT,DRAFT,
Exit ticket,Choose the best answer.,Unit 1,,2026-09-02T09:00:00+03:00,,,,"MULTIPLE_CHOICE_QUESTION",DRAFT,A;B;C;D
```

## Notes

- The dashboard sends one batch at a time and the script caps each batch at 100 rows.
- If the dashboard times out, check **Apps Script > Executions** before retrying, because some Classroom posts may already have been created.
- For a multi-admin production setup, use a server-side OAuth backend instead of an "execute as me" Apps Script bridge.
