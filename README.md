# AWS Academy Quiz

A small, dependency-free quiz site for practicing AWS Academy knowledge checks before an exam.
One HTML file, no build step, works offline.

**Live:** https://astmirzhan.github.io/aws-academy-quiz/

## Features

- 137 questions across two courses:
  - **Cloud Foundations** (modules 1-4 and 6-10): cloud basics, pricing, global infrastructure, security, compute, storage, databases, architecting, auto scaling and monitoring.
  - **Developer course**: SDLC and SDKs, S3, IAM, DynamoDB, API Gateway, Lambda and X-Ray.
- Single-answer and multi-answer ("Choose two/three") questions.
- Instant feedback: correct answers in green, mistakes in red, with a short explanation.
- Filter by module, or practice only the questions you got wrong ("My mistakes").
- Optional shuffling of questions and answers.
- Progress is saved in the browser (`localStorage`). Nothing is sent anywhere.
- Keyboard: `1`-`9` select an option, `Enter` checks / goes to the next question.
- Light and dark theme follow the system setting.

## Run locally

Open `index.html` in a browser. That's it.

## Add or edit questions

Questions live in the `Q` array at the top of the `<script>` block in `index.html`:

```js
{m:6, q:"Which service is serverless compute?", o:["EC2","Lambda","VPC"], a:[1], n:"Short explanation"}
```

- `m` module id (see the `MODS` list), `q` question, `o` options,
- `a` indexes of the correct options (more than one makes it a multi-select),
- `n` optional explanation.

## Disclaimer

This is an unofficial study aid. It is not affiliated with or endorsed by Amazon Web Services.
Correct answers were worked out from AWS knowledge, not taken from an official answer key, so a few
may be wrong. Questions with some doubt say so in their explanation. Always verify against the course material.
