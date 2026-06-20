const menuButton = document.querySelector("[data-menu]");
const nav = document.querySelector("[data-nav]");

const MAX_ATTACHMENT_FILES = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "zip",
  "log",
  "txt",
  "json",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

if (menuButton && nav) {
  menuButton.addEventListener("click", () => nav.classList.toggle("open"));
}

function getFileExtension(filename) {
  const parts = String(filename || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };
    reader.onerror = () => reject(new Error("첨부파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

async function collectAttachments(form) {
  const fileInput = form.querySelector('input[type="file"][name="attachments"]');
  const files = fileInput ? Array.from(fileInput.files || []) : [];

  if (!files.length) {
    return [];
  }

  if (files.length > MAX_ATTACHMENT_FILES) {
    throw new Error(`첨부파일은 최대 ${MAX_ATTACHMENT_FILES}개까지 가능합니다.`);
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_ATTACHMENT_BYTES) {
    throw new Error("첨부파일 전체 용량은 3MB 이하로 등록해 주세요.");
  }

  const blockedFile = files.find((file) => !ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(file.name)));
  if (blockedFile) {
    throw new Error("첨부 가능한 파일은 ZIP, LOG, TXT, JSON, CSV, PNG, JPG, WEBP입니다.");
  }

  return Promise.all(files.map(async (file) => ({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    content: await readFileAsBase64(file),
  })));
}

document.querySelectorAll("[data-contact]").forEach((form) => {
  const status = form.querySelector("[data-contact-status]");
  const button = form.querySelector('button[type="submit"]');
  const defaultButtonText = button ? button.textContent : "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const bugType = String(data.get("bugType") || "").trim();
    const rawMessage = String(data.get("message") || "").trim();
    const message = bugType ? `[오류 유형] ${bugType}\n\n${rawMessage}` : rawMessage;

    if (status) {
      status.textContent = "접수 내용을 전송하고 있습니다.";
      status.dataset.state = "pending";
    }
    if (button) {
      button.disabled = true;
      button.textContent = "전송 중";
    }

    try {
      const attachments = await collectAttachments(form);
      const payload = {
        name: data.get("name") || "",
        contact: data.get("contact") || "",
        message,
        consent: data.get("consent") === "on",
      };

      if (attachments.length) {
        payload.attachments = attachments;
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        const messageText = result.code === "MAIL_ENV_MISSING"
          ? "메일 전송 설정이 필요합니다. 관리자에게 문의해 주세요."
          : result.message || "접수 전송에 실패했습니다.";
        throw new Error(messageText);
      }

      if (status) {
        status.textContent = result.message || "정상 접수되었습니다.";
        status.dataset.state = "success";
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.textContent = error.message || "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        status.dataset.state = "error";
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = defaultButtonText;
      }
    }
  });
});
