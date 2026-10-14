// 아침 업무 요약 메일 (vercel.json 의 crons 가 평일 아침 8시에 부른다).
import { blobStore } from './_store.js';
import { mailReady, mailTo, sendMail } from './_mail.js';
import { createDigestHandler } from './_digest-core.js';

export default createDigestHandler({ store: blobStore, ready: () => mailReady(), send: (m) => sendMail(m), to: () => mailTo() });
