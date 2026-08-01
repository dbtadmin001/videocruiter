# Mock VidCruiter

A local, one-take video interview trainer for the IAEA's asynchronous pre-screening stage:
the question appears, recording starts in the same instant, and preparation + answering
share one clock.

The question categories, the review rubric and the preparation advice are taken from the
Agency's own briefing on its pre-screening process, so a mock run covers the same ground
the real screen does.

## Run it

```powershell
.\start.ps1
```

That serves the folder on [http://localhost:8000](http://localhost:8000) and opens it. **Do not open `index.html`
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
prompted it, tagged with its category, and scored 1–5 against the Agency's stated criteria:
content of the answer, communication style (structure, focus, clarity), depth and complexity
of the example, body language and posture, and fit with a positive attitude. Notes and scores
save as you type, and any answer can be downloaded as a video file.

**Questions** — edit the sets. One question per line, blank lines ignored. Prefix a line with
`[Category]` to tag it. Four sets ship by default:

| Set | Questions | For |
| --- | --- | --- |
| IAEA mock — full run | 6 | One per category — the closest thing to a real sitting |
| IAEA competency & behavioural bank | 14 | STAR stories, mapped to the eight story themes |
| Core data engineering — technical & scenario | 18 | Technical depth and situational judgement |
| Motivation & IAEA fit | 8 | Why this role, why the Agency |

The six categories are IAEA's own: Motivational, Job related generic, Job related technical,
Managerial, Scenario, and Competency based.

## Where the data lives

Recordings go into this browser's IndexedDB on this machine; settings, sessions and scores
go into localStorage. Nothing is uploaded anywhere, and there is no server beyond the static
file host. Clearing your browser's site data for `localhost:8000` erases the recordings —
download anything you want to keep.

## Using it well

- Run the **IAEA mock — full run** set in *realistic* mode end to end before the real
  interview. The pressure of a running clock with no pause is the part that is hard to
  simulate any other way.
- Review cold, ideally the next day. Score yourself before reading your own notes.
- Watch the "used X of 4:00" figure. Answers under about 90 seconds usually mean a missing
  result; answers that hit the ceiling usually mean a missing structure.
- Assessors are told to weigh **content first**, then structure and clarity, then the depth
  of your examples. Body language is explicitly "important but not essential" — so fix a
  rambling answer before you worry about your posture.
- The Agency's own advice: treat it like a normal face-to-face interview, find uninterrupted
  time, keep pen and paper to hand, and speak in a conversational voice.
