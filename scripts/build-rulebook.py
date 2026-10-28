"""Build the printable reference from export-rulebook.mjs output. Requires reportlab."""
import json, os, sys, re, html
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parent.parent
DATA=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else ROOT/'tmp/pdfs/rulebook-data.json').read_text(encoding='utf-8'))
OUT=Path(sys.argv[2] if len(sys.argv)>2 else ROOT/'output/pdf/Sweep-Brawl-Rulebook-v080.pdf')
OUT.parent.mkdir(parents=True,exist_ok=True)
font_dir=Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'
for label,file in [('Body','arial.ttf'),('Body-Bold','arialbd.ttf'),('Body-Italic','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(label,str(font_dir/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Body-Bold',italic='Body-Italic',boldItalic='Body-Bold')
INK=colors.HexColor('#172b35'); GREEN=colors.HexColor('#247563'); GRAY=colors.HexColor('#56646b'); LINE=colors.HexColor('#d9e2e3'); PAPER=colors.HexColor('#f0f6f4')
styles=getSampleStyleSheet()
for k in ['Normal','BodyText']:
    styles[k].fontName='Body';styles[k].fontSize=9.5;styles[k].leading=14;styles[k].textColor=INK;styles[k].spaceAfter=8
styles.add(ParagraphStyle(name='TitleLarge',fontName='Body-Bold',fontSize=39,leading=44,textColor=INK,spaceAfter=16))
styles.add(ParagraphStyle(name='SubtitleClean',fontName='Body',fontSize=17,leading=23,textColor=GREEN,spaceAfter=14))
styles.add(ParagraphStyle(name='Section',fontName='Body-Bold',fontSize=22,leading=28,textColor=GREEN,spaceBefore=6,spaceAfter=14,keepWithNext=True))
styles.add(ParagraphStyle(name='Topic',fontName='Body-Bold',fontSize=12,leading=17,textColor=INK,spaceBefore=12,spaceAfter=6,keepWithNext=True))
styles.add(ParagraphStyle(name='Item',fontName='Body-Bold',fontSize=14,leading=19,textColor=INK,spaceBefore=13,spaceAfter=3,keepWithNext=True))
styles.add(ParagraphStyle(name='Meta',fontName='Body-Bold',fontSize=8,leading=12,textColor=GREEN,spaceAfter=7,keepWithNext=True))
styles.add(ParagraphStyle(name='SmallClean',fontName='Body',fontSize=8,leading=11,textColor=GRAY,spaceAfter=5))
styles.add(ParagraphStyle(name='TableClean',fontName='Body',fontSize=8.3,leading=11.6,textColor=INK))
styles.add(ParagraphStyle(name='TableHeadClean',fontName='Body-Bold',fontSize=8.3,leading=11.6,textColor=colors.white))

def clean(s):
    return str(s).replace('\u2011','-').replace('\u2013','-').replace('\u2014',' - ').replace('→',' to ').replace('↔',' / ')
def p(s,style='BodyText'):return Paragraph(html.escape(clean(s)),styles[style])
def rich(s,style='BodyText'):return Paragraph(clean(s),styles[style])
story=[]
def para(s):story.append(p(s))
def topic(s):story.append(p(s,'Topic'))
def section(n,title):story.extend([PageBreak(),p(f'{n:02d}  {title}','Section')])
def table(rows,widths,compact=False):
    cells=[[p(c,'TableHeadClean' if r==0 else 'TableClean') for c in row]for r,row in enumerate(rows)]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PAPER]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,0),.5,GREEN),('LINEBELOW',(0,1),(-1,-1),.3,LINE)]))
    if compact:t.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    story.append(t);story.append(Spacer(1,10))
class NumberedCanvas(canvas.Canvas):
    def __init__(self,*a,**kw):super().__init__(*a,**kw);self.saved=[]
    def showPage(self):self.saved.append(dict(self.__dict__));self._startPage()
    def save(self):
        count=len(self.saved)
        for state in self.saved:
            self.__dict__.update(state);self.setFont('Body',8);self.setFillColor(GRAY)
            self.drawString(45,30,'Sweep Brawl  /  Rules & advanced item reference  /  v0.8.0')
            self.drawRightString(567,30,f'{self._pageNumber} / {count}')
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
def header(c,doc):
    c.saveState()
    if doc.page>1:
        c.setStrokeColor(LINE);c.line(45,750,567,750);c.setFont('Body-Bold',8);c.setFillColor(GREEN);c.drawString(45,761,'SWEEP BRAWL');c.setFont('Body',8);c.setFillColor(GRAY);c.drawRightString(567,761,'PRINT REFERENCE  |  OCTOBER 28, 2026')
    c.restoreState()

story.extend([Spacer(1,72),p('SWEEP BRAWL','Meta'),p('Read the board. Outplay the table.','TitleLarge'),p('Game rules, scoring tables and the complete advanced item reference','SubtitleClean'),Spacer(1,18)])
para('A shared-board Minesweeper party game for 1-8 participants. Clear cells, bluff with flags, collect items and haunt the living after elimination.')
para('Version 0.8.0 · October 28, 2026 · 62 current items · Party pool: 30 cards')
story.append(Spacer(1,18))
table([['This edition','What changed'],['Ghost Haunt','One harmless haunt per round plus owned anytime cards after elimination'],['Underdog scoring','Deduction-first scoring, reckless guesses, disruption rewards and an eight-times award cap'],['Draft and items','Guaranteed rare/legendary slots, a curated Party pool and a full 62-item advanced reference'],['Readable battles','Action sounds, floating avatar feedback, persistent personal callouts and round replay']],[130,392])
para('The game keeps its card descriptions compact. This reference explains exact mechanics, timing, limits and interactions, including information intentionally left off casual cards.')

def md(text,style='BodyText'):
    text=html.escape(clean(text));text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    return Paragraph(text,styles[style])
lines=(ROOT/'RULES.md').read_text(encoding='utf-8').splitlines()
paragraph=[];table_rows=[];item_block=None;section_number=0
def push(flow):
    if item_block is not None:item_block.append(flow)
    else:story.append(flow)
def flush_paragraph():
    if paragraph:
        text=' '.join(paragraph);push(md(text,'Meta' if text.startswith('**') and text.endswith('**') else 'BodyText'));paragraph.clear()
def flush_table():
    if table_rows:
        count=len(table_rows[0]);widths=[90]+[432/(count-1)]*(count-1) if count>2 else [260,262];table(table_rows,widths,compact=True);table_rows.clear()
def flush_item():
    global item_block
    if item_block is not None:story.append(KeepTogether(item_block));item_block=None
for line in lines:
    if line.startswith('# ') or line.startswith('Version '):continue
    if line.startswith('## '):
        flush_paragraph();flush_table();flush_item();section_number+=1
        if section_number==1 or line[3:]=='Advanced item reference':story.append(PageBreak())
        else:story.append(Spacer(1,16))
        story.append(p(f'{section_number:02d}  {line[3:]}','Section'));continue
    if line.startswith('### '):
        flush_paragraph();flush_table();flush_item();item_block=[p(line[4:],'Item')];continue
    if line.startswith('|'):
        flush_paragraph()
        cells=[c.strip()for c in line.strip().strip('|').split('|')]
        if all(re.match(r'^:?-+:?$',c)for c in cells):continue
        table_rows.append(cells);continue
    if not line.strip():flush_paragraph();flush_table();continue
    paragraph.append(line.strip())
flush_paragraph();flush_table();flush_item()

doc=SimpleDocTemplate(str(OUT),pagesize=(612,792),rightMargin=45,leftMargin=45,topMargin=60,bottomMargin=54,title='Sweep Brawl - Rules, Scoring & Advanced Items',author='Sweep Brawl',subject='Version 0.8.0: 62 item definitions and complete game rules',pageCompression=1)
doc.build(story,onFirstPage=header,onLaterPages=header,canvasmaker=NumberedCanvas)
print(OUT)
