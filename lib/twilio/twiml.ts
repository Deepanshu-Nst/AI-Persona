function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function welcome(audioUrl?: string): string {
  const voice = audioUrl
    ? `<Play>${esc(audioUrl)}</Play>`
    : `<Say voice="Polly.Joanna">${esc("Hi, I'm Deepanshu's AI assistant here to talk about my background, projects, or help you book a call with me directly. What would you like to know?")}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?><Response>${voice}<Gather input="speech" speechTimeout="auto" action="/api/voice/response" method="POST"/></Response>`;
}

export function answerWithGather(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${esc(text)}</Say><Gather input="speech" speechTimeout="auto" action="/api/voice/response" method="POST"/></Response>`;
}

export function answerOnly(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${esc(text)}</Say></Response>`;
}

export function hangup(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
}

export function bookingConfirm(
  date: string,
  time: string,
  duration: number,
  confirmationCode: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${esc(`All set! Your ${duration}-minute call has been confirmed for ${date} at ${time}. Your confirmation code is ${confirmationCode}. I'll send a calendar invite. Thank you for your interest in Deepanshu!`)}</Say><Hangup/></Response>`;
}
