/**
 * Auto-resize utility for textareas.
 * Attaches event listeners to automatically expand the textarea height as the user types.
 */

export function bindTextareaAutoResize(textareaElement) {
  if (!textareaElement) return;

  // Set initial height based on content
  const resize = () => {
    // Reset height to auto to correctly shrink if text is deleted
    textareaElement.style.height = 'auto';
    // Set height to scrollHeight (plus a little padding buffer)
    textareaElement.style.height = `${textareaElement.scrollHeight}px`;
  };

  textareaElement.addEventListener('input', resize);

  // Trigger once initially in case there's pre-filled content
  // Use a small timeout to ensure DOM layout is complete
  setTimeout(resize, 0);

  return () => {
    textareaElement.removeEventListener('input', resize);
  };
}

/**
 * Convenience method to bind all textareas with a specific class.
 * @param {string} selector - CSS selector for textareas, default 'textarea.input'
 */
export function bindAllTextareas(selector = 'textarea.input') {
  const textareas = document.querySelectorAll(selector);
  const unbinds = Array.from(textareas).map(bindTextareaAutoResize);
  
  return () => {
    unbinds.forEach(unbind => unbind && unbind());
  };
}
