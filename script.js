const MAX_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const assets = { customer: null, top: null, bottom: null };
let timers = [];

const canvas = document.getElementById("tryon-canvas");
const context = canvas.getContext("2d");
const transformButtons = [...document.querySelectorAll("[data-transform]")];
const editorButtons = [
  document.getElementById("select-top-button"),
  document.getElementById("select-bottom-button"),
  document.getElementById("reset-top-overlay"),
  document.getElementById("reset-bottom-overlay"),
  document.getElementById("reset-overlay"),
  ...transformButtons,
];

const HANDLE_RADIUS = 10;
const MOVE_STEP = 12;
const ROTATE_STEP = 5;
const SCALE_STEP = 1.08;
const MIN_GARMENT_WIDTH = 70;

const loadedImages = { customer: null, top: null, bottom: null };
const editorState = {
  enabled: false,
  selected: "top",
  garments: {
    top: createGarmentState(),
    bottom: createGarmentState(),
  },
  defaults: {
    top: null,
    bottom: null,
  },
  pointer: {
    mode: null,
    pointerId: null,
    garmentKey: null,
    startPoint: null,
    startGarment: null,
    handleSign: null,
    oppositeCorner: null,
  },
};

function createGarmentState() {
  return { x: 0, y: 0, width: 0, height: 0, rotation: 0, aspectRatio: 1, visible: false };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function validate(file) {
  if (!allowedTypes.has(file.type)) return "Please choose a JPG, PNG, or WEBP image.";
  if (file.size > MAX_SIZE) return "Please keep images under 10MB.";
  return null;
}

function updateReview() {
  const ready = assets.customer && assets.top && assets.bottom;
  setText(
    "review-text",
    ready
      ? "All images are ready. Generate a manual browser overlay. Transparent PNG garments work best."
      : "Add all three images to start the preview."
  );
  const measurements = [
    ["Chest", "chest"],
    ["Shoulders", "shoulder"],
    ["Shoulder-to-wrist", "shoulder-wrist"],
  ].map(([label, id]) => `${label}: ${document.getElementById(id).value || "not provided"}`);
  setText("measurement-summary", measurements.join(" · "));
  document.querySelector(".steps li:nth-child(1)").classList.toggle("active", !ready);
}

function setEditorEnabled(enabled) {
  editorState.enabled = enabled;
  editorButtons.forEach((button) => {
    button.disabled = !enabled;
  });
  setText(
    "editor-lock-note",
    enabled
      ? "Editor ready: drag garments on the canvas, resize from corner handles, and rotate as needed."
      : "Editor locked until all three images are loaded and generated."
  );
}

function invalidateEditor() {
  loadedImages.customer = null;
  loadedImages.top = null;
  loadedImages.bottom = null;
  editorState.garments.top = createGarmentState();
  editorState.garments.bottom = createGarmentState();
  editorState.defaults.top = null;
  editorState.defaults.bottom = null;
  editorState.pointer.mode = null;
  setEditorEnabled(false);
}

function showAsset(key, file) {
  const error = validate(file);
  if (error) {
    alert(error);
    return;
  }

  if (assets[key]?.url) URL.revokeObjectURL(assets[key].url);

  const url = URL.createObjectURL(file);
  assets[key] = { file, url };

  const image = document.querySelector(`[data-preview="${key}"]`);
  image.src = url;
  image.hidden = false;
  document.querySelector(`[data-copy="${key}"]`).hidden = true;
  document.querySelector(`[data-remove="${key}"]`).hidden = false;

  invalidateEditor();
  updateReview();
}

function removeAsset(key) {
  if (assets[key]?.url) URL.revokeObjectURL(assets[key].url);

  assets[key] = null;
  const image = document.querySelector(`[data-preview="${key}"]`);
  image.removeAttribute("src");
  image.hidden = true;
  document.querySelector(`[data-copy="${key}"]`).hidden = false;
  document.querySelector(`[data-remove="${key}"]`).hidden = true;
  document.querySelector(`[data-input="${key}"]`).value = "";

  invalidateEditor();
  document.getElementById("result-panel").hidden = true;
  document.getElementById("result-placeholder").hidden = false;
  updateReview();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function drawContained(targetContext, image, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  targetContext.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function initializeGarmentDefaults() {
  const top = loadedImages.top;
  const bottom = loadedImages.bottom;

  const topWidth = canvas.width * 0.48;
  const topHeight = topWidth * (top.naturalHeight / top.naturalWidth);
  const bottomWidth = canvas.width * 0.39;
  const bottomHeight = bottomWidth * (bottom.naturalHeight / bottom.naturalWidth);

  editorState.garments.top = {
    x: (canvas.width - topWidth) / 2,
    y: canvas.height * 0.22,
    width: topWidth,
    height: topHeight,
    rotation: 0,
    aspectRatio: top.naturalWidth / top.naturalHeight,
    visible: true,
  };

  editorState.garments.bottom = {
    x: (canvas.width - bottomWidth) / 2,
    y: canvas.height * 0.49,
    width: bottomWidth,
    height: bottomHeight,
    rotation: 0,
    aspectRatio: bottom.naturalWidth / bottom.naturalHeight,
    visible: true,
  };

  editorState.defaults.top = { ...editorState.garments.top };
  editorState.defaults.bottom = { ...editorState.garments.bottom };
}

function getCenter(garment) {
  return { x: garment.x + garment.width / 2, y: garment.y + garment.height / 2 };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function rotatePoint(point, radians) {
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

function localToGlobal(localPoint, garment) {
  const center = getCenter(garment);
  const rotated = rotatePoint(localPoint, toRadians(garment.rotation));
  return { x: center.x + rotated.x, y: center.y + rotated.y };
}

function globalToLocal(globalPoint, garment) {
  const center = getCenter(garment);
  const relative = { x: globalPoint.x - center.x, y: globalPoint.y - center.y };
  return rotatePoint(relative, -toRadians(garment.rotation));
}

function getGarmentCorners(garment) {
  const halfW = garment.width / 2;
  const halfH = garment.height / 2;

  return {
    nw: localToGlobal({ x: -halfW, y: -halfH }, garment),
    ne: localToGlobal({ x: halfW, y: -halfH }, garment),
    se: localToGlobal({ x: halfW, y: halfH }, garment),
    sw: localToGlobal({ x: -halfW, y: halfH }, garment),
  };
}

function drawGarment(image, garment) {
  if (!garment.visible) return;

  const center = getCenter(garment);
  context.save();
  context.translate(center.x, center.y);
  context.rotate(toRadians(garment.rotation));
  context.drawImage(image, -garment.width / 2, -garment.height / 2, garment.width, garment.height);
  context.restore();
}

function drawSelection() {
  if (!editorState.enabled) return;

  const selectedGarment = editorState.garments[editorState.selected];
  if (!selectedGarment?.visible) return;

  const corners = getGarmentCorners(selectedGarment);
  const cornerList = [corners.nw, corners.ne, corners.se, corners.sw];

  context.save();
  context.strokeStyle = "#1d3fd8";
  context.fillStyle = "#ffffff";
  context.lineWidth = 2.4;
  context.setLineDash([9, 7]);
  context.beginPath();
  context.moveTo(cornerList[0].x, cornerList[0].y);
  cornerList.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.stroke();
  context.setLineDash([]);

  cornerList.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });
  context.restore();
}

function redrawCanvas() {
  if (!loadedImages.customer || !loadedImages.top || !loadedImages.bottom) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f1f2f4";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawContained(context, loadedImages.customer, canvas.width, canvas.height);
  drawGarment(loadedImages.bottom, editorState.garments.bottom);
  drawGarment(loadedImages.top, editorState.garments.top);
  drawSelection();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function getHandleAtPoint(point) {
  const garment = editorState.garments[editorState.selected];
  if (!garment?.visible) return null;

  const corners = getGarmentCorners(garment);
  const handles = [
    { key: "nw", signX: -1, signY: -1, point: corners.nw },
    { key: "ne", signX: 1, signY: -1, point: corners.ne },
    { key: "se", signX: 1, signY: 1, point: corners.se },
    { key: "sw", signX: -1, signY: 1, point: corners.sw },
  ];

  return handles.find((handle) => {
    const dx = point.x - handle.point.x;
    const dy = point.y - handle.point.y;
    return Math.hypot(dx, dy) <= HANDLE_RADIUS * 1.7;
  }) || null;
}

function pointInGarment(point, garment) {
  if (!garment.visible) return false;
  const local = globalToLocal(point, garment);
  return Math.abs(local.x) <= garment.width / 2 && Math.abs(local.y) <= garment.height / 2;
}

function getGarmentAtPoint(point) {
  const drawOrder = ["top", "bottom"];
  return drawOrder.find((key) => pointInGarment(point, editorState.garments[key])) || null;
}

function setSelectedGarment(key) {
  editorState.selected = key;
  const topButton = document.getElementById("select-top-button");
  const bottomButton = document.getElementById("select-bottom-button");

  const topSelected = key === "top";
  topButton.classList.toggle("active-layer", topSelected);
  bottomButton.classList.toggle("active-layer", !topSelected);
  topButton.setAttribute("aria-pressed", String(topSelected));
  bottomButton.setAttribute("aria-pressed", String(!topSelected));

  if (editorState.enabled) redrawCanvas();
}

function clampGarmentToCanvas(garment) {
  const overscan = 180;
  const minX = -garment.width + overscan;
  const maxX = canvas.width - overscan;
  const minY = -garment.height + overscan;
  const maxY = canvas.height - overscan;
  garment.x = Math.min(Math.max(garment.x, minX), maxX);
  garment.y = Math.min(Math.max(garment.y, minY), maxY);
}

function startPointerInteraction(event) {
  if (!editorState.enabled) return;

  const point = getCanvasPoint(event);
  const resizeHandle = getHandleAtPoint(point);

  if (resizeHandle) {
    const garment = editorState.garments[editorState.selected];
    const halfW = garment.width / 2;
    const halfH = garment.height / 2;
    const oppositeCorner = localToGlobal(
      { x: -resizeHandle.signX * halfW, y: -resizeHandle.signY * halfH },
      garment
    );

    editorState.pointer = {
      mode: "resize",
      pointerId: event.pointerId,
      garmentKey: editorState.selected,
      startPoint: point,
      startGarment: { ...garment },
      handleSign: { x: resizeHandle.signX, y: resizeHandle.signY },
      oppositeCorner,
    };

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  const targetGarment = getGarmentAtPoint(point);
  if (!targetGarment) return;

  setSelectedGarment(targetGarment);

  editorState.pointer = {
    mode: "drag",
    pointerId: event.pointerId,
    garmentKey: targetGarment,
    startPoint: point,
    startGarment: { ...editorState.garments[targetGarment] },
    handleSign: null,
    oppositeCorner: null,
  };

  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function continuePointerInteraction(event) {
  if (!editorState.enabled || editorState.pointer.pointerId !== event.pointerId) return;

  const pointer = editorState.pointer;
  const garment = editorState.garments[pointer.garmentKey];
  const point = getCanvasPoint(event);

  if (pointer.mode === "drag") {
    garment.x = pointer.startGarment.x + (point.x - pointer.startPoint.x);
    garment.y = pointer.startGarment.y + (point.y - pointer.startPoint.y);
    clampGarmentToCanvas(garment);
    redrawCanvas();
    return;
  }

  if (pointer.mode === "resize") {
    const opposite = pointer.oppositeCorner;
    const rotation = toRadians(pointer.startGarment.rotation);
    const vectorToPointer = rotatePoint(
      { x: point.x - opposite.x, y: point.y - opposite.y },
      -rotation
    );

    const aspect = pointer.startGarment.aspectRatio;
    const widthFromX = Math.max(Math.abs(vectorToPointer.x), MIN_GARMENT_WIDTH);
    const widthFromY = Math.max(Math.abs(vectorToPointer.y) * aspect, MIN_GARMENT_WIDTH);
    const maxWidth = canvas.width * 1.6;
    const newWidth = Math.min(Math.max(widthFromX, widthFromY), maxWidth);
    const newHeight = newWidth / aspect;

    const centerOffsetLocal = {
      x: pointer.handleSign.x * (newWidth / 2),
      y: pointer.handleSign.y * (newHeight / 2),
    };
    const centerOffsetGlobal = rotatePoint(centerOffsetLocal, rotation);

    garment.width = newWidth;
    garment.height = newHeight;
    garment.x = opposite.x + centerOffsetGlobal.x - newWidth / 2;
    garment.y = opposite.y + centerOffsetGlobal.y - newHeight / 2;
    clampGarmentToCanvas(garment);
    redrawCanvas();
  }
}

function endPointerInteraction(event) {
  if (editorState.pointer.pointerId !== event.pointerId) return;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  editorState.pointer = {
    mode: null,
    pointerId: null,
    garmentKey: null,
    startPoint: null,
    startGarment: null,
    handleSign: null,
    oppositeCorner: null,
  };
}

function applyButtonTransform(action) {
  if (!editorState.enabled) return;

  const garment = editorState.garments[editorState.selected];

  switch (action) {
    case "up":
      garment.y -= MOVE_STEP;
      break;
    case "down":
      garment.y += MOVE_STEP;
      break;
    case "left":
      garment.x -= MOVE_STEP;
      break;
    case "right":
      garment.x += MOVE_STEP;
      break;
    case "rotate-left":
      garment.rotation -= ROTATE_STEP;
      break;
    case "rotate-right":
      garment.rotation += ROTATE_STEP;
      break;
    case "scale-up": {
      const newWidth = Math.min(garment.width * SCALE_STEP, canvas.width * 1.6);
      const newHeight = newWidth / garment.aspectRatio;
      garment.x -= (newWidth - garment.width) / 2;
      garment.y -= (newHeight - garment.height) / 2;
      garment.width = newWidth;
      garment.height = newHeight;
      break;
    }
    case "scale-down": {
      const newWidth = Math.max(garment.width / SCALE_STEP, MIN_GARMENT_WIDTH);
      const newHeight = newWidth / garment.aspectRatio;
      garment.x += (garment.width - newWidth) / 2;
      garment.y += (garment.height - newHeight) / 2;
      garment.width = newWidth;
      garment.height = newHeight;
      break;
    }
    default:
      return;
  }

  clampGarmentToCanvas(garment);
  redrawCanvas();
}

function resetGarmentOverlay(key) {
  const defaults = editorState.defaults[key];
  if (!defaults) return;
  editorState.garments[key] = { ...defaults };
  setSelectedGarment(key);
  redrawCanvas();
}

function resetAllOverlays() {
  if (!editorState.defaults.top || !editorState.defaults.bottom) return;
  editorState.garments.top = { ...editorState.defaults.top };
  editorState.garments.bottom = { ...editorState.defaults.bottom };
  redrawCanvas();
}

async function composePreview() {
  loadedImages.customer = await loadImage(assets.customer.url);
  loadedImages.top = await loadImage(assets.top.url);
  loadedImages.bottom = await loadImage(assets.bottom.url);
  initializeGarmentDefaults();
  setSelectedGarment("top");
  setEditorEnabled(true);
  redrawCanvas();
}

["customer", "top", "bottom"].forEach((key) => {
  const input = document.querySelector(`[data-input="${key}"]`);
  input.addEventListener("change", () => input.files[0] && showAsset(key, input.files[0]));

  document.querySelector(`[data-camera="${key}"]`).addEventListener("click", () => input.click());
  document.querySelector(`[data-remove="${key}"]`).addEventListener("click", () => removeAsset(key));

  const zone = document.querySelector(`[data-dropzone="${key}"]`);
  ["dragenter", "dragover"].forEach((name) => {
    zone.addEventListener(name, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    zone.addEventListener(name, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    });
  });

  zone.addEventListener("drop", (event) => event.dataTransfer.files[0] && showAsset(key, event.dataTransfer.files[0]));
});

["chest", "shoulder", "shoulder-wrist", "fit"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateReview);
});

canvas.addEventListener("pointerdown", startPointerInteraction);
canvas.addEventListener("pointermove", continuePointerInteraction);
canvas.addEventListener("pointerup", endPointerInteraction);
canvas.addEventListener("pointercancel", endPointerInteraction);

transformButtons.forEach((button) => {
  button.addEventListener("click", () => applyButtonTransform(button.dataset.transform));
});

document.getElementById("select-top-button").addEventListener("click", () => setSelectedGarment("top"));
document.getElementById("select-bottom-button").addEventListener("click", () => setSelectedGarment("bottom"));
document.getElementById("reset-top-overlay").addEventListener("click", () => resetGarmentOverlay("top"));
document.getElementById("reset-bottom-overlay").addEventListener("click", () => resetGarmentOverlay("bottom"));
document.getElementById("reset-overlay").addEventListener("click", resetAllOverlays);

document.getElementById("generate-button").addEventListener("click", () => {
  if (!assets.customer || !assets.top || !assets.bottom) {
    alert("Please add your customer, shirt, and pants images first.");
    return;
  }

  clearTimers();
  setEditorEnabled(false);
  document.getElementById("status-panel").hidden = false;
  document.getElementById("result-panel").hidden = true;
  document.getElementById("generate-button").disabled = true;

  const phases = [
    [20, "Preparing a secure local canvas..."],
    [45, "Loading your customer photo..."],
    [70, "Placing shirt and pants overlays..."],
    [92, "Finalizing the browser preview..."],
    [100, "Overlay preview ready."],
  ];

  phases.forEach(([progress, message], index) => {
    timers.push(
      setTimeout(() => {
        document.getElementById("progress-bar").style.width = `${progress}%`;
        setText("progress-label", `${progress}% complete`);
        setText("status-text", message);
      }, index * 850)
    );
  });

  timers.push(
    setTimeout(async () => {
      try {
        await composePreview();
        document.getElementById("status-panel").hidden = true;
        document.getElementById("result-panel").hidden = false;
        document.getElementById("generate-button").disabled = false;
        document.getElementById("result-placeholder").hidden = true;

        setText("chest-insight", document.getElementById("chest").value || "Not provided");
        setText("shoulder-insight", document.getElementById("shoulder").value || "Not provided");
        setText("arm-insight", document.getElementById("shoulder-wrist").value || "Not provided");
        setText("fit-insight", document.getElementById("fit").value || "Manual overlay only · use transparent PNG garments");

        document.querySelectorAll(".steps li").forEach((step) => step.classList.remove("active"));
        document.querySelector(".steps li:nth-child(4)").classList.add("active");
      } catch {
        alert("The browser could not compose these images. Try transparent PNG garment images.");
        document.getElementById("status-panel").hidden = true;
        document.getElementById("generate-button").disabled = false;
      }
    }, 4000)
  );
});

document.getElementById("download-button").addEventListener("click", () => {
  if (!editorState.enabled) {
    alert("Generate the overlay first, then adjust and download it.");
    return;
  }
  const link = document.createElement("a");
  link.download = "fashion-agent-overlay.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.getElementById("reset-button").addEventListener("click", () => {
  clearTimers();
  ["customer", "top", "bottom"].forEach(removeAsset);
  ["height", "weight", "size", "shape", "fit", "chest", "shoulder", "shoulder-wrist"].forEach((id) => {
    document.getElementById(id).value = "";
  });

  invalidateEditor();
  context.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById("status-panel").hidden = true;
  document.getElementById("result-panel").hidden = true;
  document.getElementById("progress-bar").style.width = "0%";
  setText("progress-label", "0% complete");

  document.querySelectorAll(".steps li").forEach((step) => step.classList.remove("active"));
  document.querySelector(".steps li:nth-child(1)").classList.add("active");
  updateReview();
});

setSelectedGarment("top");
setEditorEnabled(false);
updateReview();
