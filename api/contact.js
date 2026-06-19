const MAX_MESSAGE_LENGTH = 4000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(res, statusCode, body) {
  return res.status(statusCode).json(body);
}

function getRequiredEnv() {
  return {
    to: process.env.CONTACT_TO,
    from: process.env.CONTACT_FROM,
    resendKey: process.env.RESEND_API_KEY,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { ok: false, message: "허용되지 않는 요청입니다." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || "").trim();
    const contact = String(body.contact || "").trim();
    const message = String(body.message || "").trim();
    const consent = Boolean(body.consent);

    if (!name || !contact || !message || !consent) {
      return sendJson(res, 400, {
        ok: false,
        message: "필수 항목과 개인정보 수집 동의를 확인해 주세요.",
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return sendJson(res, 400, {
        ok: false,
        message: "접수 내용은 4,000자 이내로 입력해 주세요.",
      });
    }

    const { to, from, resendKey } = getRequiredEnv();

    if (!to || !from || !resendKey) {
      return sendJson(res, 503, {
        ok: false,
        code: "MAIL_ENV_MISSING",
        message: "메일 발송 환경이 설정되지 않았습니다.",
      });
    }

    const isBugReport = message.startsWith("[오류 유형]");
    const mailTitle = isBugReport ? "Alpha Viper System 버그 접수" : "Alpha Viper System 제품 문의";

    const emailBody = [
      mailTitle,
      "",
      `이름: ${name}`,
      `연락처: ${contact}`,
      "",
      "접수 내용:",
      message,
    ].join("\n");

    const emailHtml = `
      <div style="font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.65;color:#111827">
        <h2 style="margin:0 0 16px">${mailTitle}</h2>
        <p><strong>이름</strong><br>${escapeHtml(name)}</p>
        <p><strong>연락처</strong><br>${escapeHtml(contact)}</p>
        <p><strong>접수 내용</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      </div>
    `;

    const mailPayload = {
      from,
      to,
      subject: isBugReport ? "[Alpha Viper System] 버그 접수" : "[Alpha Viper System] 제품 문의",
      text: emailBody,
      html: emailHtml,
    };

    if (EMAIL_PATTERN.test(contact)) {
      mailPayload.reply_to = contact;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailPayload),
    });

    if (!response.ok) {
      const detail = await response.text();
      return sendJson(res, 502, {
        ok: false,
        code: "MAIL_PROVIDER_ERROR",
        message: "메일 발송 서비스 응답을 확인해야 합니다.",
        detail,
      });
    }

    return sendJson(res, 200, { ok: true, message: "정상 접수되었습니다." });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "접수 처리 중 오류가 발생했습니다.",
      detail: error.message,
    });
  }
}
