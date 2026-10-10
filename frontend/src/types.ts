export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'dialogue'
  | 'image'
  | 'image_caption'
  | 'table'
  | 'table_cell'
  | 'footnote'
  | 'header_footer'
  | 'page_break'
  | 'chapter_break'
  | 'hyperlink'
  | 'list_item'
  | 'equation'
  | 'ruby_text'
  | 'embedded_object'
  | 'raw_code'
  | 'separator';

export type PipelineStage =
  | 'idle'
  | 'validating_file'
  | 'extracting_structure'
  | 'building_ir_tree'
  | 'indexing_blocks'
  | 'segmenting_chunks'
  | 'translating_blocks'
  | 'reinjecting_text'
  | 'reconstructing_doc'
  | 'validating_output'
  | 'ready'
  | 'failed';

export type ToneStyle = 'natural' | 'formal' | 'academic' | 'technical' | 'literal';

export type TranslationProvider = 'demo' | 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface GlossaryEntry {
  term: string;
  translation: string;
  category?: 'character' | 'place' | 'technical' | 'untranslatable' | 'general';
  notes?: string;
}

export interface TranslationConfig {
  source_language: string;
  target_language: string;
  tone: ToneStyle;
  provider: TranslationProvider;
  api_key?: string;
  api_base_url?: string;
  model_name?: string;
  preserve_ruby: boolean;
  preserve_illustrations: boolean;
  preserve_footnotes: boolean;
  bilingual_mode: boolean;
  custom_glossary: GlossaryEntry[];
  do_not_translate: string[];
  ocr_enabled: boolean;
  chapter_scope?: number | null;
  target_format?: string | null;
}

export interface DocumentNode {
  id: string;
  sequence_index: number;
  block_type: BlockType;
  source_text: string;
  translated_text: string;
  is_translatable: boolean;
  chapter_index: number;
  chapter_title?: string;
  level?: number;
  asset_id?: string;
  row_idx?: number;
  col_idx?: number;
  is_header_cell?: boolean;
  status: 'pending' | 'in_progress' | 'translated' | 'skipped' | 'error';
  error_message?: string;
  attributes?: Record<string, any>;
}

export interface AssetData {
  asset_id: string;
  path?: string;
  mime?: string;
  size?: number;
  base64?: string;
}

export interface StructuralComparison {
  source_block_count: number;
  target_block_count: number;
  source_image_count: number;
  target_image_count: number;
  source_chapter_count: number;
  target_chapter_count: number;
  is_sequence_strictly_preserved: boolean;
  missing_node_ids: string[];
  unexpected_node_ids: string[];
  image_reference_mismatches: string[];
  warnings: string[];
  fidelity_score: number;
}

export interface JobStatusResponse {
  job_id: string;
  filename: string;
  format: string;
  stage: PipelineStage;
  stage_index: number;
  progress_percentage: number;
  status_message: string;
  total_blocks: number;
  translatable_blocks: number;
  translated_blocks: number;
  character_count: number;
  estimated_tokens: number;
  estimated_cost_usd: number;
  warnings: string[];
  error?: string;
  is_demo: boolean;
  has_output: boolean;
}

export interface JobPreviewResponse {
  job_id: string;
  title: string;
  source_format: string;
  chapters: Array<{ chapter_index: number; title: string; path?: string }>;
  nodes: DocumentNode[];
  assets: Record<string, AssetData>;
  validation?: StructuralComparison;
}

export interface AstGraphChapter {
  chapter_index: number;
  title: string;
  nodes: Array<{
    id: string;
    sequence_index: number;
    block_type: BlockType;
    preview_source: string;
    preview_target: string;
    status: string;
    is_translatable: boolean;
    asset_id?: string;
  }>;
}

export interface AstGraphResponse {
  doc_id: string;
  title: string;
  total_nodes: number;
  chapters: AstGraphChapter[];
  validation_fidelity: number;
}
