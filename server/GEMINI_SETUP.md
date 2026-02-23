# Gemini AI Help setup

The **AI Help** feature uses Google's Gemini API to suggest troubleshooting steps based on the ticket description (subject_request).

## 1. Get a Gemini API key

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/).
2. Create or select a project.
3. Enable the **Generative Language API** (or "Gemini API") for your project.
4. Go to **Credentials** → **Create credentials** → **API key**.
5. Copy the API key.

Alternatively you can create an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## 2. Configure the server

Add the key to your server environment.

**Option A – `.env` (recommended)**  
In the `server` folder, add to your `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
# Optional: force a single model. By default the app tries free-tier models in order:
# gemini-2.5-flash-lite (15 RPM, 1000 RPD) → gemini-2.5-flash → gemini-2.0-flash
# GEMINI_MODEL=gemini-2.5-flash-lite
```

**Option B – System environment**  
Set the `GEMINI_API_KEY` environment variable when starting the server.

## 3. Install dependencies

In the `server` folder run:

```bash
npm install
```

This installs `@google/generative-ai`. Then start the server as usual.

## 4. Usage

- Log in as a **user** (not admin/team/head).
- Open **List Requests**.
- In the **Action** column, click **AI Help** for a request.
- The app sends the ticket’s description to Gemini and shows suggested troubleshooting steps in a modal.

If `GEMINI_API_KEY` is missing or invalid, the AI Help button will show an error message in the modal.

### If you get "model not found" (404)

The default model is `gemini-2.0-flash`. If your project doesn’t have access to it, set `GEMINI_MODEL` to a model that is available in your project.

To list models available for your API key:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_API_KEY"
```

Use one of the returned model names (e.g. `gemini-1.5-pro`, `gemini-2.0-flash`) as `GEMINI_MODEL` in your `.env`.

### If you get "429 Too Many Requests" or "quota exceeded"

- **Free tier:** You may have hit the per-minute or daily limit. Wait a minute and try again; the app will automatically retry once after 40 seconds if the server sees a rate-limit error.
- **Limit 0:** If the error says `limit: 0` for free tier, your project may have no free quota for that model. Enable billing for the project in [Google Cloud Console](https://console.cloud.google.com/billing), or try a different model (set `GEMINI_MODEL` to another model from the list endpoint).
- Monitor usage: [https://ai.dev/rate-limit](https://ai.dev/rate-limit) and [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
