// This file extends the HTMLImageElement interface to include fetchPriority

interface HTMLImageElement extends HTMLElement {
  fetchPriority?: 'high' | 'low' | 'auto';
}