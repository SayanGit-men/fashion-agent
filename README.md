# Fashion Agent

Privacy-first AI virtual try-on frontend built with Next.js.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

- `npm run dev` - run local development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint checks

## Frontend workflow

The main page provides a complete virtual try-on flow:

1. Upload/capture a customer photo
2. Upload/capture a shirt/top image
3. Upload/capture a pants/bottom image
4. Optionally enter profile details (height, weight, usual size, body shape, fit preference)
5. Review all inputs and start generation
6. Watch a polished local processing state with progress updates
7. View a mock result panel with fit insight cards (shoulders, waist, length, overall fit)

### Privacy behavior

- Images are handled only in client-side state with local object URLs.
- No image is uploaded to external services by this frontend.
- Each upload can be removed individually.
- A reset session action clears all images, profile details, and generated state.

## Mock generation note

`Start mock try-on` currently runs a local simulated workflow for MVP/demo use.
No real AI model or backend provider is called yet.

To integrate a real provider, replace the mock generation logic in:

- `/home/runner/work/fashion-agent/fashion-agent/src/app/page.tsx` (`startGeneration` function)

with your secure API call and result handling.
