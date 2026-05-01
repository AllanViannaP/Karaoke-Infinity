# Local Karaoke

Local karaoke program for Windows: paste a YouTube link, play the video, and monitor the system microphone through the speakers.

## How to open

1. Run `start-karaoke.bat`.
2. The browser opens at `http://127.0.0.1:4173`.
3. Paste a YouTube link and click `Play`.
4. Click `Turn on` in the microphone area and allow browser access when prompted.

It also works from the terminal with `node server.js` if Node.js is installed.

## Languages

The interface starts in English and includes a language selector for English, Portuguese, Spanish, and Japanese.

## Notes

- Microphone audio goes to the Windows default output. If the browser supports output switching, the `Output` selector also works.
- To avoid loud feedback, use headphones or keep the gain low before turning on the microphone.
- Some YouTube videos block embedded playback; in those cases the app shows a message at the top.
