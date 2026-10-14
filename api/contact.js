// 홈페이지 문의 양식 받기. 메일 설정은 _mail.js 참고.
import { mailReady, mailTo, sendMail } from './_mail.js';
import { createContactHandler } from './_contact-core.js';

export default createContactHandler({ ready: () => mailReady(), send: (m) => sendMail(m), to: () => mailTo() });
