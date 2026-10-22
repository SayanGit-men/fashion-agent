const MAX_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const assets = { customer: null, top: null, bottom: null };
let timers = [];

function setText(id, value) { document.getElementById(id).textContent = value; }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function validate(file) {
  if (!allowedTypes.has(file.type)) return "Please choose a JPG, PNG, or WEBP image.";
  if (file.size > MAX_SIZE) return "Please keep images under 10MB.";
  return null;
}
function updateReview() {
  const ready = assets.customer && assets.top && assets.bottom;
  setText("review-text", ready ? "All images are ready. Add optional profile details, then generate a preview." : "Add all three images to start the preview.");
  document.querySelector(".steps li:nth-child(1)").classList.toggle("active", !ready);
}
function showAsset(key, file) {
  const error = validate(file);
  if (error) { alert(error); return; }
  if (assets[key]?.url) URL.revokeObjectURL(assets[key].url);
  const url = URL.createObjectURL(file);
  assets[key] = { file, url };
  const image = document.querySelector(`[data-preview="${key}"]`);
  const copy = document.querySelector(`[data-copy="${key}"]`);
  image.src = url; image.hidden = false; copy.hidden = true;
  document.querySelector(`[data-remove="${key}"]`).hidden = false;
  updateReview();
}
function removeAsset(key) {
  if (assets[key]?.url) URL.revokeObjectURL(assets[key].url);
  assets[key] = null;
  const image = document.querySelector(`[data-preview="${key}"]`);
  image.removeAttribute("src"); image.hidden = true;
  document.querySelector(`[data-copy="${key}"]`).hidden = false;
  document.querySelector(`[data-remove="${key}"]`).hidden = true;
  document.querySelector(`[data-input="${key}"]`).value = "";
  updateReview();
}

["customer", "top", "bottom"].forEach((key) => {
  const input = document.querySelector(`[data-input="${key}"]`);
  input.addEventListener("change", () => input.files[0] && showAsset(key, input.files[0]));
  document.querySelector(`[data-camera="${key}"]`).addEventListener("click", () => input.click());
  document.querySelector(`[data-remove="${key}"]`).addEventListener("click", () => removeAsset(key));
  const zone = document.querySelector(`[data-dropzone="${key}"]`);
  ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (event) => { event.preventDefault(); zone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (event) => { event.preventDefault(); zone.classList.remove("dragging"); }));
  zone.addEventListener("drop", (event) => event.dataTransfer.files[0] && showAsset(key, event.dataTransfer.files[0]));
});

document.getElementById("generate-button").addEventListener("click", () => {
  if (!assets.customer || !assets.top || !assets.bottom) { alert("Please add your customer, shirt, and pants images first."); return; }
  clearTimers();
  document.getElementById("status-panel").hidden = false;
  document.getElementById("result-panel").hidden = true;
  document.getElementById("generate-button").disabled = true;
  const phases = [[20, "Preparing a secure local preview..."], [45, "Balancing lighting and image tone..."], [70, "Matching garment proportions to your profile..."], [92, "Finalizing your mock try-on..."], [100, "Preview ready."]];
  phases.forEach(([progress, message], index) => {
    timers.push(setTimeout(() => { document.getElementById("progress-bar").style.width = `${progress}%`; setText("progress-label", `${progress}% complete`); setText("status-text", message); }, index * 850));
  });
  timers.push(setTimeout(() => {
    document.getElementById("status-panel").hidden = true;
    document.getElementById("result-panel").hidden = false;
    document.getElementById("generate-button").disabled = false;
    const resultImage = document.getElementById("result-image");
    resultImage.src = assets.customer.url; resultImage.hidden = false;
    document.getElementById("result-placeholder").hidden = true;
    setText("waist-insight", document.getElementById("fit").value || "Balanced contour");
    document.querySelectorAll(".steps li").forEach((step) => step.classList.remove("active"));
    document.querySelector(".steps li:nth-child(4)").classList.add("active");
  }, 4000));
});

document.getElementById("reset-button").addEventListener("click", () => {
  clearTimers();
  ["customer", "top", "bottom"].forEach(removeAsset);
  ["height", "weight", "size", "shape", "fit"].forEach((id) => { document.getElementById(id).value = ""; });
  document.getElementById("status-panel").hidden = true;
  document.getElementById("result-panel").hidden = true;
  document.getElementById("progress-bar").style.width = "0%";
  setText("progress-label", "0% complete");
  document.querySelectorAll(".steps li").forEach((step) => step.classList.remove("active"));
  document.querySelector(".steps li:nth-child(1)").classList.add("active");
});
