# Mock VidCruiter

A local, one-take video interview trainer that mirrors the VidCruiter format: the question
appears, recording starts in the same instant, and preparation + answering share one clock.

## Run it

```powershell
.\start.ps1
```

That serves the folder on <http://localhost:8000> and opens it. **Do not open `index.html`
directly** — browsers block camera access on `file://` URLs, so it has to be localhost.

Chrome or Edge recommended. The first run asks for camera and microphone permission.

## The two roles

**Practice** — pick a set, check your camera and mic, then sit the interview.
A 3-second lead-in, then the question appears and recording begins together. A ring counts
down 4:00 with soft warnings at 60s and 10s. Submit early to move on, or let the clock run
out and it advances by itself.

- *Realistic* mode: one take, no pause, no retakes — how the real thing behaves.
- *Practice* mode: adds a retake button that discards the current take and re-asks.

**Review** — the interviewer panel. Every answer plays back beside the question that
prompted it, with a 1–5 rubric (structure/STAR, content, clarity, impact), notes, and how
much of your four minutes you actually used. Scores and notes save as you type. Any answer
can be downloaded as a video file.

**Questions** — edit the sets. One question per line, blank lines ignored. The default set
is twelve competency-style data engineering questions.

## Where the data lives

Recordings go into this browser's IndexedDB on this machine; settings, sessions and scores
go into localStorage. Nothing is uploaded anywhere, and there is no server beyond the static
file host. Clearing your browser's site data for `localhost:8000` erases the recordings —
download anything you want to keep.

## Using it well

- Run it in *realistic* mode at least once end to end before the real interview. The
  pressure of a running clock with no pause is the part that is hard to simulate any other way.
- Review cold, ideally the next day. Score yourself before reading your own notes.
- Watch the "used X of 4:00" figure. Answers under about 90 seconds usually mean a missing
  result; answers that hit the ceiling usually mean a missing structure.
