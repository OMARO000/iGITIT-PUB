# iGITit

Plain-language analysis of public code repositories (GitHub, GitLab, Radicle) for journalists, regulators, researchers and the public: what the software does, the data it collects, stores and sends, its HAI score across 9 pillars, dark patterns, license and the organisation behind it. Compare two repositories, read a plain-language changelog, and seal any analysis with a verifiable SHA-256 record pinned to IPFS.

Governed by OMARO Public Benefit Corporation. iGITit lives in [IRIS by OMARO](https://omaro.xyz), the Firefox add-on; this repository is its server: the public API, the verification records and the API documentation at [omaro.xyz/igitit/docs](https://omaro.xyz/igitit/docs).

## How a reading works

1. The server reads the repository itself, at one commit (`app/lib/repo.ts`).
2. If that commit was read before, the stored reading is returned at no cost; readings are shared by everyone (`app/lib/store.ts`).
3. Otherwise a model reads it, if today's budget allows (`app/lib/model.ts`). Every model call reserves its worst-case cost first and records its real cost after.
4. When the day's budget is used up, the newest stored reading of the repository is shown, marked with its date and commit. New readings resume after midnight UTC.

Compare and Changelog follow the same rules. Changelog reads at most 25 commits and runs only when asked.

Each address gets 10 fresh readings an hour; stored readings are free and unlimited.

## Settings

| Name | What it is |
|---|---|
| `MODEL_API_KEY` | The model provider's API key. |
| `IGITIT_MODEL` | The model to use (default `claude-sonnet-5-5`). |
| `IGITIT_DAILY_BUDGET_USD` | The most the model may cost per day, in US dollars (default 5). |
| `IGITIT_DATABASE_URL` | Postgres for stored readings and spending (schema `igitit`). Without it, nothing is stored and spending is counted in memory. |
| `GITHUB_TOKEN`, `GITLAB_TOKEN` | Higher rate limits for reading repositories. |
| `PINATA_JWT` | Pinning verification records to IPFS. |

## Development

```bash
npm install
npm run dev      # http://localhost:3002/igitit/docs
npm test         # unit tests; database tests run when IGITIT_TEST_DB points at an empty Postgres database
```

Hosted on Render (`render.yaml`, branch `render`), served at omaro.xyz/igitit through the OMARO site.
