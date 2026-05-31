# Audio Transcription 🎙️→📝

**A Next.js web app that transcribes audio to text — upload a file or record live from your mic — powered by Groq's Distil-Whisper.**

Record audio directly in the browser or upload a file, and get fast, accurate transcription back with the detected language and duration. Built on the Next.js App Router with a clean shadcn/ui interface.

## Features
- 🎤 **Record in the browser** — capture audio live via the MediaRecorder API.
- 📁 **Upload audio files** — file picker with format/size validation.
- ⚡ **Fast transcription** — Groq-hosted `distil-whisper-large-v3-en`.
- 🌐 **Rich output** — returns transcript text, detected language, and duration.
- ✅ **Friendly errors** — handles unsupported formats, oversized files, and rate limits.
- 🎨 **Polished UI** — Next.js 15 + React 19 + Tailwind + shadcn/ui.

## Supported formats
`flac` · `mp3` · `mp4` · `mpeg` · `mpga` · `m4a` · `ogg` · `opus` · `wav` · `webm` — up to **25 MB**.

## How it works
```
browser (upload / mic) ──▶ POST /api/transcribe ──▶ Groq Audio API
                                                     (distil-whisper-large-v3-en)
                                                  ──▶ { text, language, duration }
```
The server route (`app/api/transcribe/route.ts`) validates the file, forwards it to Groq's OpenAI-compatible transcription endpoint, and returns the result.

## Getting started
```bash
# 1. Install dependencies
pnpm install            # or: npm install

# 2. Add your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env.local

# 3. Run the dev server
pnpm dev                # http://localhost:3000
```
Grab a free API key from the [Groq Console](https://console.groq.com/keys).

## Scripts
| Command | Action |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production server |
| `pnpm lint` | Lint |

## Environment variables
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key (used server-side only) |

## Tech stack
**Next.js 15 (App Router)** · **React 19** · **TypeScript** · **Tailwind CSS** · **shadcn/ui (Radix)** · **Groq API** (`distil-whisper-large-v3-en`)
