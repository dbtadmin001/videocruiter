# Mock VidCruiter

A local, one-take video interview trainer for the IAEA's asynchronous pre-screening stage:
the question appears, recording starts in the same instant, and preparation + answering
share one clock.

The question categories, the review rubric and the preparation advice are taken from the
Agency's own briefing on its pre-screening process; the questions themselves are built
against the Data Engineer (P3) vacancy notice. A mock run covers the same ground the real
screen does.

> A personal rehearsal tool. Not affiliated with, endorsed by, or connected to the IAEA —
> the styling only mirrors the real process so that practice feels like the real thing.

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
| IAEA mock — full run (P3 · Safeguards) | 6 | One per category — the closest thing to a real sitting |
| Competency bank — IAEA core & functional | 20 | STAR stories, tagged with the competency each targets |
| Technical & scenario — P3 vacancy stack | 30 | The platforms and situations the notice actually names |
| Motivation & IAEA fit | 10 | Why this role, why the Agency, why Safeguards |

The six categories are IAEA's own: Motivational, Job related generic, Job related technical,
Managerial, Scenario, and Competency based. Competency questions carry a second tag —
`[Competency based · Teamwork]` — naming which competency they probe.

## What the questions are aligned to

The post is **Data Engineer (P3), Department of Safeguards, Office of Information and
Communication Systems (SGIS), Vienna**, reporting to a Team Leader.

- **Competencies** are the seven named on the vacancy notice, not a generic framework:
  Communication, Achieving Results, Teamwork and Planning & Organizing (core); Client
  orientation, Commitment to continuous process improvement, and Technical/scientific
  credibility (functional).
- **Technical questions** cover the platforms the notice lists — Spark, Trino, Airflow,
  Iceberg, dbt core, Kafka, S3, Elasticsearch/OpenSearch, MongoDB, SQL Server, Python and
  SQL — plus the things the role is actually responsible for: maintaining an **on-premise**
  architecture while moving toward a **lakehouse**, optimizing data flows and queries,
  dimensional modelling, and assessing and prototyping emerging technologies.
- **Scenarios** are drawn from the role's stated context: on-premise capacity limits,
  migrating a legacy warehouse without interrupting analysts, confidential safeguards
  information, and inconsistent upstream sources.

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
