export interface Template {
  pages: TemplatePage[];
}

export interface TemplatePage {
  blocks: TemplateBlock[];
}

export type TemplateBlock =
  | TitleBlock
  | ParagraphBlock
  | InfoGroupBlock
  | DeliverablesBlock
  | PriceBlock
  | BannerBlock
  | LogoBlock
  | DividerBlock;

export interface TitleBlock {
  type: "title";
  text: string;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface InfoGroupBlock {
  type: "info_group";
  items: InfoItem[];
}

export interface InfoItem {
  label: string;
  value: string;
}

export interface DeliverablesBlock {
  type: "deliverables";
  items: DeliverableItem[];
}

export interface DeliverableItem {
  label: string;
  description: string;
}

export interface PriceBlock {
  type: "price";
  value: number;
  discount?: number;
  in12x?: number;
}

export interface BannerBlock {
  type: "banner";
  url: string;
}

export interface LogoBlock {
  type: "logo";
  url: string;
}

export interface DividerBlock {
  type: "divider";
}