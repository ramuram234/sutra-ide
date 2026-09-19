#!/usr/bin/env python3
"""Generate APCFSS internal note: Nidhi ESS AI × Budget AI integration."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable,
    Flowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

OUT = "/workspace/artifacts/APCFSS_Nidhi_Budget_AI_Integration_Note.pdf"

NAVY = HexColor("#0F3D5E")
NAVY_DARK = HexColor("#0A2A42")
TEAL = HexColor("#1A7A6D")
GOLD = HexColor("#C47B2B")
RED = HexColor("#9B2C2C")
LIGHT = HexColor("#F4F7FA")
LIGHT_TEAL = HexColor("#E8F4F1")
LIGHT_GOLD = HexColor("#FBF3E8")
LIGHT_RED = HexColor("#F8EEEE")
LINE = HexColor("#D5DEE7")
MUTED = HexColor("#4A5B6A")
TEXT = HexColor("#1C2833")


class HLine(Flowable):
    def __init__(self, color=GOLD, thickness=2, width=None):
        Flowable.__init__(self)
        self.color = color
        self.thickness = thickness
        self._width = width

    def wrap(self, aw, ah):
        self.width = self._width or aw
        return self.width, self.thickness + 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 1, self.width, 1)


class Callout(Flowable):
    def __init__(self, text, width, bg=LIGHT_TEAL, border=TEAL, title=None):
        Flowable.__init__(self)
        self.text = text
        self.box_width = width
        self.bg = bg
        self.border = border
        self.title = title
        self._height = 0

    def wrap(self, aw, ah):
        styles = getSampleStyleSheet()
        body = ParagraphStyle(
            "cbody", parent=styles["Normal"],
            fontName="Times-Roman", fontSize=10.5, leading=14.5,
            textColor=TEXT, alignment=TA_JUSTIFY,
        )
        title_s = ParagraphStyle(
            "ctitle", parent=styles["Normal"],
            fontName="Times-Bold", fontSize=9, leading=12,
            textColor=self.border, spaceAfter=4,
        )
        inner = self.box_width - 16
        flow = []
        h = 14
        if self.title:
            p = Paragraph(self.title.upper(), title_s)
            pw, ph = p.wrap(inner, 800)
            flow.append((p, ph))
            h += ph + 2
        p = Paragraph(self.text, body)
        pw, ph = p.wrap(inner, 1200)
        flow.append((p, ph))
        h += ph
        self._flow = flow
        self._height = h
        self.width = self.box_width
        self.height = h
        return self.box_width, h

    def draw(self):
        self.canv.setFillColor(self.bg)
        self.canv.setStrokeColor(self.border)
        self.canv.setLineWidth(1.2)
        self.canv.roundRect(0, 0, self.box_width, self._height, 4, fill=1, stroke=1)
        self.canv.setFillColor(self.border)
        self.canv.rect(0, 0, 4, self._height, fill=1, stroke=0)
        y = self._height - 8
        for p, ph in self._flow:
            y -= ph
            p.drawOn(self.canv, 12, y)
            y -= 2


def add_header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY_DARK)
    canvas.rect(0, h - 16 * mm, w, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 16.8 * mm, w, 1.6 * mm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Times-Bold", 9)
    canvas.drawString(18 * mm, h - 8.2 * mm, "APCFSS  ·  INTERNAL NOTE")
    canvas.setFont("Times-Roman", 8.5)
    canvas.drawRightString(w - 18 * mm, h - 8.2 * mm, "Nidhi ESS AI  ×  Budget AI  ·  Integration")

    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 12 * mm, w, 1.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Times-Roman", 8)
    canvas.drawString(18 * mm, 5 * mm, "Confidential — for internal discussion only  ·  19 September 2026")
    canvas.drawRightString(w - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def P(text, style):
    return Paragraph(text, style)


def make_styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(
        "CoverOrg", fontName="Times-Bold", fontSize=11, leading=14,
        textColor=GOLD, alignment=TA_CENTER, spaceAfter=2, tracking=0.6,
    ))
    s.add(ParagraphStyle(
        "CoverTitle", fontName="Times-Bold", fontSize=18, leading=23,
        textColor=NAVY_DARK, alignment=TA_CENTER, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "CoverSub", fontName="Times-Italic", fontSize=11, leading=15,
        textColor=MUTED, alignment=TA_CENTER, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "Meta", fontName="Times-Roman", fontSize=10, leading=14,
        textColor=TEXT, alignment=TA_LEFT, spaceAfter=2,
    ))
    s.add(ParagraphStyle(
        "H1", fontName="Times-Bold", fontSize=13, leading=16,
        textColor=NAVY, spaceBefore=14, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "H2", fontName="Times-Bold", fontSize=11.5, leading=15,
        textColor=TEAL, spaceBefore=10, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "Body", fontName="Times-Roman", fontSize=10.5, leading=15,
        textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "BulletBody", fontName="Times-Roman", fontSize=10.5, leading=14.5,
        textColor=TEXT, leftIndent=12, spaceAfter=3,
    ))
    s.add(ParagraphStyle(
        "Th", fontName="Times-Bold", fontSize=9, leading=12,
        textColor=white, alignment=TA_CENTER,
    ))
    s.add(ParagraphStyle(
        "Td", fontName="Times-Roman", fontSize=9, leading=12.5,
        textColor=TEXT, alignment=TA_LEFT,
    ))
    s.add(ParagraphStyle(
        "TdC", fontName="Times-Roman", fontSize=9, leading=12.5,
        textColor=TEXT, alignment=TA_CENTER,
    ))
    s.add(ParagraphStyle(
        "TdB", fontName="Times-Bold", fontSize=9, leading=12.5,
        textColor=NAVY, alignment=TA_LEFT,
    ))
    s.add(ParagraphStyle(
        "Caption", fontName="Times-Italic", fontSize=8.5, leading=11,
        textColor=MUTED, alignment=TA_CENTER, spaceBefore=2, spaceAfter=8,
    ))
    s.add(ParagraphStyle(
        "FooterNote", fontName="Times-Italic", fontSize=9, leading=12,
        textColor=MUTED, alignment=TA_LEFT, spaceBefore=8,
    ))
    s.add(ParagraphStyle(
        "Talk", fontName="Times-Italic", fontSize=10.5, leading=15,
        textColor=NAVY_DARK, alignment=TA_LEFT, leftIndent=8, rightIndent=8,
    ))
    return s


def table(data, col_widths, header=True):
    style_cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
    ]
    if header:
        style_cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
            ("BACKGROUND", (0, 1), (-1, -1), white),
        ]
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    t.setStyle(TableStyle(style_cmds))
    return t


def build():
    styles = make_styles()
    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="APCFSS Internal Note — Nidhi ESS AI × Budget AI Integration",
        author="APCFSS",
        subject="Integration of Nidhi ESS AI Agent with Budget / CFMS Ledger AI Agent",
    )
    W = A4[0] - 36 * mm
    story = []

    # ----- COVER BLOCK -----
    story.append(Spacer(1, 4))
    story.append(P("ANDHRA PRADESH CENTRE FOR FINANCIAL SYSTEMS AND SERVICES", styles["CoverOrg"]))
    story.append(P("(APCFSS)", styles["CoverOrg"]))
    story.append(Spacer(1, 6))
    story.append(HLine(GOLD, 2.2, W))
    story.append(Spacer(1, 10))
    story.append(P("Internal Note", styles["CoverSub"]))
    story.append(P("Integration of Nidhi ESS AI Agent<br/>with Budget (CFMS Ledger) AI Agent", styles["CoverTitle"]))
    story.append(P("A join of the people ledger and the money ledger — so the State can answer, in one place, whether this month’s salary can be paid, where an employee’s bill is stuck, and whether GPF / APGLI deductions actually reached Public Account.", styles["CoverSub"]))
    story.append(Spacer(1, 8))
    story.append(HLine(NAVY, 0.8, W))
    story.append(Spacer(1, 8))

    meta = [
        [P("<b>To</b>", styles["Meta"]), P("Manager / Delivery Head, APCFSS", styles["Meta"])],
        [P("<b>From</b>", styles["Meta"]), P("Nidhi ESS AI  &  Budget AI product teams", styles["Meta"])],
        [P("<b>Date</b>", styles["Meta"]), P("19 September 2026", styles["Meta"])],
        [P("<b>Subject</b>", styles["Meta"]), P("Proposed feature: Nidhi–Budget AI join (read-only pilot)", styles["Meta"])],
        [P("<b>Classification</b>", styles["Meta"]), P("Internal — for discussion  ·  Not for circulation outside APCFSS", styles["Meta"])],
        [P("<b>Decision sought</b>", styles["Meta"]), P("Approve a 4-week, one-DDO, read-only pilot", styles["Meta"])],
    ]
    mt = Table(meta, colWidths=[38 * mm, W - 38 * mm])
    mt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
        ("LEFTPADDING", (1, 0), (1, -1), 6),
        ("RIGHTPADDING", (1, 0), (1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    story.append(mt)
    story.append(Spacer(1, 12))

    story.append(Callout(
        "Nidhi already knows <b>who must be paid</b> and what was cut from the slip. "
        "Budget AI already knows <b>whether the HOA can pay</b> and whether that cut reached Public Account. "
        "Today those two facts never meet. This note proposes that they meet — without rewriting either product, "
        "without posting to SAP, and without showing DDO budgets to employees.",
        W, LIGHT_GOLD, GOLD, "The idea in four sentences",
    ))

    # 1. PURPOSE
    story.append(P("1. Purpose of this note", styles["H1"]))
    story.append(P(
        "This note explains a proposed feature that connects two AI products already built inside APCFSS. "
        "It is written so that a manager can take a decision without reading architecture papers. "
        "The technical approach is included only to show that the two existing stacks can talk to each other "
        "without a rewrite.",
        styles["Body"],
    ))
    story.append(P(
        "It answers five questions: what we already have; what problem we are solving; what the feature looks like for an employee and a DDO; how Spring AI (Nidhi) and LangGraph (Budget) will integrate; and what we are asking approval for.",
        styles["Body"],
    ))

    # 2. WHAT WE HAVE
    story.append(P("2. What we already have (do not rebuild)", styles["H1"]))
    story.append(P(
        "APCFSS already runs two live AI agents on top of systems we own. They are complementary. They are not competitors.",
        styles["Body"],
    ))

    th = styles["Th"]
    td = styles["Td"]
    tdb = styles["TdB"]
    have = [
        [P("Product", th), P("Stack", th), P("Already answers", th), P("Does not answer", th)],
        [
            P("<b>Nidhi ESS AI</b><br/>nidhi.apcfss.in", tdb),
            P("Java<br/>Spring AI", td),
            P("Employee HR, salary, payslip, arrears, pension, GPF, APGLI", td),
            P("Whether HOA 010 can fund this month; where the CFMS bill is sitting; whether the GPF cut reached Public Account", td),
        ],
        [
            P("<b>Budget / CFMS Ledger AI</b>", tdb),
            P("Python<br/>LangGraph", td),
            P("Budget, expenditure, receipts, Public Account, PD accounts, pending bills", td),
            P("Who must be paid this month; headcount vs provision; whose GPF was cut on the slip", td),
        ],
    ]
    story.append(table(have, [38 * mm, 28 * mm, 52 * mm, W - 118 * mm]))
    story.append(P("Table 1. Current product ownership — people ledger vs money ledger.", styles["Caption"]))

    story.append(P(
        "In short: Nidhi is the <b>people ledger</b>. Budget AI is the <b>money ledger</b>. "
        "CFMS was always meant to be a single source of truth across establishment and accounts. "
        "SAP stores both, but no user gets one sentence from both. That sentence is the feature.",
        styles["Body"],
    ))

    # 3. PROBLEM
    story.append(P("3. The problem we see every month", styles["H1"]))
    story.append(P(
        "Salary day, GPF credits and pending bills already generate SRTS tickets and DDO escalations. The data to answer them exists. It lives in two places.",
        styles["Body"],
    ))

    problem = [
        [P("Who", th), P("What they see today", th), P("What is actually true", th)],
        [
            P("<b>Employee</b>", tdb),
            P("Opens Nidhi. No September payslip. Assumes payroll is broken. Calls DDO / SRTS / treasury.", td),
            P("The salary bill is pending at STO. Nidhi is correct (no slip). The status is on the Budget / CFMS side.", td),
        ],
        [
            P("<b>DDO / HoO</b>", tdb),
            P("Submits salary bill. CFMS rejects it on Budget Availability Check, or parks it. Then reconciles 010 vs Nidhi strength in Excel.", td),
            P("DA arrear + new joinings + EL encashment already sat in Nidhi as liability, and 010 was short before submit.", td),
        ],
        [
            P("<b>Finance / HOD</b>", tdb),
            P("Budget AI shows HOA 010 spent 112%. Instruction: “control expenditure.”", td),
            P("Nidhi has 22 contract regularizations. Payroll moved to 010; budget still assumed old strength. Cause is establishment, not waste.", td),
        ],
        [
            P("<b>GPF / APGLI subscriber</b>", tdb),
            P("Payslip shows the cut. Passbook / policy does not move. Blames Nidhi or the DDO.", td),
            P("Deduction happened in HCM. Remittance to Public Account did not. Only Budget AI can see that break.", td),
        ],
    ]
    story.append(table(problem, [32 * mm, (W - 32 * mm) / 2, (W - 32 * mm) / 2]))
    story.append(P("Table 2. Same incident, two half-answers — that is the gap.", styles["Caption"]))

    story.append(P(
        "The CAG Information Systems Audit of CFMS has already documented the ugly form of this gap: excess pension drawals, duplicate payments, PD balances that administrators did not know about, and books that do not match. "
        "A monthly join of Nidhi and the ledger will not close every audit para. It will catch the recurring ones <b>in the month</b>, instead of three years later.",
        styles["Body"],
    ))

    # 4. FEATURE
    story.append(P("4. Proposed feature — three skills, not a new portal", styles["H1"]))
    story.append(P(
        "We will not launch a third chatbot and we will not merge the two user interfaces. "
        "We will add three skills that <b>call the other product as a tool</b>. Each skill has a clear user, a clear question, and a clear privacy line.",
        styles["Body"],
    ))

    story.append(P("4.1  Skill A — “Where is my salary?”  (employee, on Nidhi)", styles["H2"]))
    story.append(P(
        "<b>Who:</b> Government employee or pensioner, already logged into Nidhi ESS AI.<br/>"
        "<b>Trigger:</b> No payslip this month, or “where is my salary / arrear / pension?”<br/>"
        "<b>What Nidhi does:</b> Confirms there is no slip, then calls Budget AI with that CFMS ID and month only.<br/>"
        "<b>What the employee sees:</b>",
        styles["Body"],
    ))
    story.append(Callout(
        "“Your September salary is in bill <b>2026-010-77821</b>. It is pending at STO Vijayawada since 15 September (4 days). "
        "This is not a payroll error. The payslip will appear after payment.”",
        W, LIGHT_TEAL, TEAL,
    ))
    story.append(Spacer(1, 6))
    story.append(P(
        "<b>Privacy line:</b> the employee sees only <i>their</i> bill status. They never see DDO budget, HOA balances, or anyone else’s name. "
        "<b>Why it is useful:</b> this is the most common SRTS pattern. Nidhi stops being a dead payslip store and becomes the place that tells the truth.",
        styles["Body"],
    ))

    story.append(P("4.2  Skill B — “Will this month’s salary bill pass?”  (DDO, on Budget AI)", styles["H2"]))
    story.append(P(
        "<b>Who:</b> DDO / Head of Office, on Budget AI.<br/>"
        "<b>Trigger:</b> Before submitting the monthly salary bill, or when BAC is about to fail.<br/>"
        "<b>What Budget AI does:</b> Calls Nidhi for this DDO, this month: regular salary + arrear + pension (+ EL encashment if available) and headcount. Compares with HOA <b>010</b> remaining and pending salary bills already in CFMS.<br/>"
        "<b>What the DDO sees:</b>",
        styles["Body"],
    ))
    story.append(Callout(
        "<b>Salary cover — DDO XXXX — September 2026</b><br/>"
        "Liability from Nidhi: Rs.1.12 crore &nbsp;·&nbsp; HOA 010 left: Rs.0.95 crore &nbsp;·&nbsp; Already pending salary bills: Rs.0.08 crore<br/>"
        "<b>Short by Rs.0.25 crore.</b> Main cause: DA arrear batch for 40 people (Rs.18 lakh) + 6 new joinings.<br/>"
        "Action: stagger arrears, seek reappropriation, or hold EL — <i>before</i>  the bill is submitted.",
        W, LIGHT_GOLD, GOLD,
    ))
    story.append(Spacer(1, 6))
    story.append(P(
        "<b>Privacy line:</b> DDO sees only that DDO. Finance / HOD may see department roll-up. "
        "<b>Why it is useful:</b> it prevents a failed salary bill instead of explaining it after 400 people miss credit. Salary day is a district-level problem. This is the one screen a DDO will open every month without training.",
        styles["Body"],
    ))

    story.append(P("4.3  Skill C — “GPF / APGLI cut vs remittance”  (DDO / treasury)", styles["H2"]))
    story.append(P(
        "Nidhi already has GPF and APGLI on the employee side. Budget AI already has Public Account. Neither currently proves the other. "
        "Per DDO, per month, we compare: sum of GPF (and APGLI) deductions on Nidhi slips versus Public Account credit / remittance versus any related pending bill.",
        styles["Body"],
    ))
    story.append(Callout(
        "This DDO, August: GPF cut on 86 slips = Rs.8.4 lakh. Public Account credit = Rs.8.1 lakh. "
        "<b>Exception: 4 CFMS IDs — deducted on slip, not remitted.</b> Same pattern for APGLI premium and loan recovery.",
        W, LIGHT_RED, RED,
    ))
    story.append(Spacer(1, 6))
    story.append(P(
        "<b>What we do not send:</b> GPF passbooks, APGLI policy PDFs, or full payslips into Budget AI. Only month + DDO + amounts + exception CFMS IDs. "
        "<b>Why it is useful:</b> money has already been taken from the employee. Today that becomes a grievance. After this, it becomes a reconciliation list. AG GPF and APGLI corporation disputes shrink.",
        styles["Body"],
    ))

    story.append(P(
        "Two further checks use the same join and need no new screens: "
        "<b>arrear cover</b> (Nidhi arrear queue vs 010 remaining) and "
        "<b>pension double-draw</b> (same CFMS ID on salary and pension in the same month, both paid in expenditure). "
        "CAG has already flagged excess pension. This is how we catch it in-month.",
        styles["Body"],
    ))

    # 5. USEFULNESS
    story.append(P("5. How this is useful — by stakeholder", styles["H1"]))
    story.append(P(
        "Usefulness is not “we added AI.” Usefulness is a question the State cannot answer today in one place, answered in one card.",
        styles["Body"],
    ))

    use = [
        [P("Stakeholder", th), P("What changes", th), P("Why they will care", th)],
        [P("<b>Employee / pensioner</b>", tdb), P("Knows where salary, arrear or pension is stuck, inside Nidhi.", td), P("Stops panic and the largest class of SRTS tickets.", td)],
        [P("<b>DDO / HoO</b>", tdb), P("Knows before submit whether 010 will hold, and why.", td), P("Salary day is their accountability.", td)],
        [P("<b>Treasury / STO</b>", tdb), P("Sees whether a pending bill is “no cover” or process lag.", td), P("Workload and fewer avoidable returns.", td)],
        [P("<b>HOD / Finance</b>", tdb), P("Sees the cause of 010 overrun: strength, arrear, CER — not a slogan to “control spend.”", td), P("Fair budget control; evidence for reappropriation.", td)],
        [P("<b>AG / APGLI / CAG</b>", tdb), P("Exception lists instead of forensic reconstruction after three years.", td), P("Live control against known audit paras.", td)],
        [P("<b>APCFSS</b>", tdb), P("Two agents become one G2E × G2G product, without a new portal.", td), P("We stop being two chatbot demos and start being a control system.", td)],
    ]
    story.append(table(use, [38 * mm, 62 * mm, W - 100 * mm]))
    story.append(P("Table 3. Who gains, and why the feature will be used.", styles["Caption"]))

    story.append(Callout(
        "Three questions this join exists to answer:<br/>"
        "1. Can we pay these people this month?<br/>"
        "2. If not, is it budget, a pending bill, or a wrong establishment?<br/>"
        "3. Money cut from the slip — did it actually reach GPF / APGLI / pension?",
        W, LIGHT, NAVY, "The only three questions that matter",
    ))

    # 6. OUT OF SCOPE
    story.append(P("6. What this feature is not (out of scope)", styles["H1"]))
    story.append(P("Writing these down protects the pilot from becoming a platform programme.", styles["Body"]))
    out = [
        [P("Out of scope", th), P("Why", th)],
        [P("A new citizen / employee app or a third chatbot", td), P("Both user groups already have a place to talk.", td)],
        [P("Putting payslips inside Budget AI, or HOA balances inside employee Nidhi chat", td), P("Wrong audience; DPDP and role risk.", td)],
        [P("Agent posting or approving bills in SAP / CFMS", td), P("Human submits. Agent only shows and pre-checks.", td)],
        [P("Sharing Aadhaar, PAN, bank account, or full payslip across agents", td), P("Not required for the join. Totals + exception IDs are enough.", td)],
        [P("Rewriting Nidhi in Python or Budget AI in Java", td), P("Two products, two runtimes, one contract — same as CFMS talking to NIDHI today.", td)],
        [P("Receipts, PD radar, Works, GST, vendor “when will I be paid?”", td), P("Valid later products. They do not need Nidhi HR data. Keep them out of this pilot.", td)],
        [P("Training a new LLM or buying GPU", td), P("Existing agents plus two MCP servers are enough.", td)],
    ]
    story.append(table(out, [78 * mm, W - 78 * mm]))
    story.append(P("Table 4. Explicit non-goals for the pilot.", styles["Caption"]))

    # 7. TECHNICAL
    story.append(P("7. How we integrate Nidhi and Budget AI — MCP, not a rewrite", styles["H1"]))
    story.append(P(
        "Nidhi ESS AI is <b>Spring AI (Java)</b>. Budget AI is <b>Python LangGraph</b>. "
        "We will not merge codebases. We will not share a JVM or a Python environment. "
        "We will expose each product as an <b>MCP server</b> (Model Context Protocol) and let each agent act as an <b>MCP client</b> of the other. "
        "MCP is the standard tool protocol Spring AI already ships (server + client starters) and that LangGraph consumes via <b>langchain-mcp-adapters</b>. "
        "Stdio MCP is for a laptop. We will use <b>Stateless Streamable HTTP</b> — Spring AI’s production default — on the AP data centre network, behind existing SSO.",
        styles["Body"],
    ))
    story.append(Callout(
        "<b>Employee</b> talks only to Nidhi ESS AI. That agent is an MCP client of <i>nidhi-ess-mcp</i> (own data) and of <i>cfms-ledger-mcp</i> for <i>one</i> tool: bill status.<br/>"
        "<b>DDO / FD</b> talks only to Budget AI. That agent is an MCP client of <i>cfms-ledger-mcp</i> (own data) and of <i>nidhi-ess-mcp</i> for <i>one</i> tool: DDO-month liability.<br/>"
        "The user never switches bot. The other system is a tool, not a chat.",
        W, LIGHT_TEAL, TEAL, "Integration in one paragraph",
    ))
    story.append(Spacer(1, 8))

    story.append(P("7.1  What MCP servers we need to build (only two)", styles["H2"]))
    story.append(P(
        "Do not build a third “join” MCP. Salary-cover and GPF-break are <b>agent skills</b> that call tools from both servers. "
        "Do not wrap SAP as a generic SQL MCP. Every tool is a named use-case with a role check.",
        styles["Body"],
    ))
    mcp_srv = [
        [P("MCP server", th), P("Runtime", th), P("Talks to", th), P("Owner", th)],
        [
            P("<b>nidhi-ess-mcp</b>", tdb),
            P("Java / Spring AI<br/>spring-ai-starter-mcp-server-webmvc<br/>protocol = STATELESS", td),
            P("NIDHI APIs / DB only<br/>(salary, payslip, GPF, APGLI, pension, HR)", td),
            P("Nidhi ESS AI team", td),
        ],
        [
            P("<b>cfms-ledger-mcp</b>", tdb),
            P("Python FastMCP / official MCP SDK<br/>Streamable HTTP, stateless", td),
            P("CFMS read replica / existing Budget AI data layer<br/>(budget, exp, PA, PD, pending bills)", td),
            P("Budget AI team", td),
        ],
    ]
    story.append(table(mcp_srv, [38 * mm, 52 * mm, 55 * mm, W - 145 * mm]))
    story.append(P("Table 5. Two MCP servers — one per ledger. Nothing else for the pilot.", styles["Caption"]))

    story.append(P(
        "<b>Transport:</b> HTTPS on internal URLs, for example nidhi-mcp.apcfss.internal/mcp and cfms-mcp.apcfss.internal/mcp. "
        "<b>Auth:</b> same SSO bearer the user already has; the MCP server enforces role. "
        "<b>Allow-list:</b> each client is configured with only the tools it is allowed to see. Nidhi agent must not discover HOA-balance tools. Budget agent must not discover payslip tools.",
        styles["Body"],
    ))

    story.append(P("7.2  Tools on nidhi-ess-mcp", styles["H2"]))
    story.append(P(
        "Publish only what the other agent may call. Employee payslip / GPF passbook stay as <b>local Spring AI tools</b> inside the Nidhi agent — they are not on the MCP surface that Budget AI can see.",
        styles["Body"],
    ))
    nidhi_tools = [
        [P("Tool (MCP name)", th), P("Who may call", th), P("In / out", th), P("Pilot?", th)],
        [
            P("<b>nidhi_get_liability</b>", tdb),
            P("DDO / HoO / FD<br/>(Budget AI client)", td),
            P("In: ddo, fy, month<br/>Out: regular, arrear, pension, gpf_deducted, apgli_deducted, headcount, exception CFMS IDs", td),
            P("Yes — Skill B", td),
        ],
        [
            P("<b>nidhi_get_gpf_deductions</b>", tdb),
            P("DDO / treasury", td),
            P("In: ddo, month<br/>Out: total deducted, exception IDs (no passbooks)", td),
            P("Stretch — Skill C", td),
        ],
        [
            P("<b>nidhi_get_apgli_deductions</b>", tdb),
            P("DDO / treasury", td),
            P("Same shape as GPF", td),
            P("Stretch — Skill C", td),
        ],
        [
            P("payslip / gpf_balance / pension_slip", td),
            P("Employee, <b>Nidhi agent only</b> — not published on MCP to Budget", td),
            P("Own CFMS ID", td),
            P("Already built; do not MCP-share", td),
        ],
    ]
    story.append(table(nidhi_tools, [42 * mm, 38 * mm, 62 * mm, W - 142 * mm]))
    story.append(P("Table 6. nidhi-ess-mcp tool catalogue.", styles["Caption"]))

    story.append(P("7.3  Tools on cfms-ledger-mcp", styles["H2"]))
    cfms_tools = [
        [P("Tool (MCP name)", th), P("Who may call", th), P("In / out", th), P("Pilot?", th)],
        [
            P("<b>cfms_get_bill_status</b>", tdb),
            P("Employee<br/>(Nidhi agent client)", td),
            P("In: cfms_id, month<br/>Out: bill_no, type (salary / arrear / pension), stage, days pending", td),
            P("Yes — Skill A", td),
        ],
        [
            P("<b>cfms_get_hoa_balance</b>", tdb),
            P("DDO / FD<br/>(Budget AI, local)", td),
            P("In: ddo, hoa, fy<br/>Out: BE, spent, pending, remaining (010 first)", td),
            P("Yes — Skill B", td),
        ],
        [
            P("<b>cfms_get_pending_bills</b>", tdb),
            P("DDO / FD", td),
            P("In: ddo, month, bill_type<br/>Out: count, amount, stages", td),
            P("Yes — Skill B", td),
        ],
        [
            P("<b>cfms_get_pa_credits</b>", tdb),
            P("DDO / treasury", td),
            P("In: ddo, month, head (GPF / APGLI)<br/>Out: remitted amount", td),
            P("Stretch — Skill C", td),
        ],
        [
            P("PD / receipts / works tools", td),
            P("Budget AI local only — not published to Nidhi client", td),
            P("Already in Budget agent", td),
            P("No — out of this join", td),
        ],
    ]
    story.append(table(cfms_tools, [42 * mm, 38 * mm, 62 * mm, W - 142 * mm]))
    story.append(P("Table 7. cfms-ledger-mcp tool catalogue.", styles["Caption"]))

    story.append(P("7.4  How each existing agent is wired", styles["H2"]))
    story.append(P(
        "<b>Nidhi ESS AI (Spring AI) — MCP client + MCP server.</b> "
        "Keep the current ChatClient. Add spring-ai-starter-mcp-server-webmvc and expose nidhi_get_liability as an @McpTool, protocol STATELESS. "
        "Add spring-ai-starter-mcp-client with one Streamable-HTTP connection to cfms-ledger-mcp. Bind only <b>cfms_get_bill_status</b> into the employee ChatClient tool list. "
        "When the user has no payslip, the model calls that one remote tool. It cannot see HOA balances because those tools are not in its list.",
        styles["Body"],
    ))
    story.append(P(
        "<b>Budget AI (LangGraph) — MCP client; Python MCP server beside it.</b> "
        "Keep the current graph. Stand up cfms-ledger-mcp in the same Python service (FastMCP) wrapping the data functions you already use for budget, pending bills and Public Account. "
        "In the graph, use MultiServerMCPClient (langchain-mcp-adapters) with two connections: local cfms-ledger-mcp and remote nidhi-ess-mcp. "
        "Skill B node calls nidhi_get_liability + cfms_get_hoa_balance + cfms_get_pending_bills, then formats the cover card. "
        "Do not give the Budget graph the employee payslip tools.",
        styles["Body"],
    ))

    wire = [
        [P("Agent", th), P("MCP client of", th), P("Tools allowed on that client", th)],
        [P("Nidhi ESS AI (employee chat)", td), P("cfms-ledger-mcp", td), P("cfms_get_bill_status only", td)],
        [P("Nidhi ESS AI (own domain)", td), P("local Spring @Tool (not remote MCP)", td), P("payslip, GPF, APGLI, pension — already built", td)],
        [P("Budget AI (DDO chat)", td), P("nidhi-ess-mcp", td), P("nidhi_get_liability; later GPF/APGLI deductions", td)],
        [P("Budget AI (own domain)", td), P("cfms-ledger-mcp (same process)", td), P("hoa_balance, pending_bills, pa_credits, existing ledger tools", td)],
    ]
    story.append(table(wire, [52 * mm, 48 * mm, W - 100 * mm]))
    story.append(P("Table 8. Allow-list — this is the security design, not an afterthought.", styles["Caption"]))

    story.append(P("7.5  What we will not build as MCP", styles["H2"]))
    no_mcp = [
        [P("Do not build", th), P("Why", th)],
        [P("A third “join” or “salary_fit” MCP server", td), P("That is an agent skill composing two tools. A third server becomes another system of record.", td)],
        [P("Generic SAP / HANA SQL MCP", td), P("The model must not invent queries. Named tools only. Protect HANA.", td)],
        [P("Stdio / desktop MCP (Claude Desktop style)", td), P("Wrong runtime. These are two HTTP services on the data centre, not a laptop.", td)],
        [P("Write tools (post bill, approve leave, change HOA)", td), P("Pilot is read-only. Human submits in CFMS.", td)],
        [P("MCP tools that return payslip PDF, Aadhaar, bank, PAN", td), P("DPDP. Aggregates and exception IDs only across the boundary.", td)],
        [P("Shared vector DB as “integration”", td), P("Memory is not the join. Live MCP tools are the join.", td)],
    ]
    story.append(table(no_mcp, [70 * mm, W - 70 * mm]))
    story.append(P("Table 9. MCP anti-catalogue.", styles["Caption"]))

    story.append(P("7.6  Contract still in force (join keys, audit, memory)", styles["H2"]))
    story.append(P(
        "<b>Join keys:</b> CFMS ID, DDO code, HOA (010 / 040 first), bill number, FY, month. "
        "<b>Audit:</b> every MCP call logged (agent, user role, tool name, keys, latency; no payslip body). Same retention as CFMS. "
        "<b>Memory:</b> Redis session may hold role, DDO, FY. Liability and balances always from MCP tools, never from chat history. "
        "<b>Cache:</b> DDO-month aggregates until payroll close — so chat traffic does not hit production HANA per token.",
        styles["Body"],
    ))

    story.append(P("7.7  Ownership", styles["H2"]))
    own = [
        [P("Piece", th), P("Owner", th)],
        [P("nidhi-ess-mcp + Skill A (where is my salary)", td), P("Nidhi ESS AI team (Spring AI)", td)],
        [P("cfms-ledger-mcp + Skills B and C (cover, GPF break)", td), P("Budget AI team (LangGraph / FastMCP)", td)],
        [P("Tool allow-lists, SSO on MCP HTTP, audit format", td), P("Joint — one page, signed by both tech leads", td)],
        [P("Pilot DDO relationship and feedback", td), P("Delivery / CFMS functional", td)],
    ]
    story.append(table(own, [95 * mm, W - 95 * mm]))
    story.append(P("Table 10. Who owns which MCP — so the pilot does not stall.", styles["Caption"]))

    # 8. PRIVACY
    story.append(P("8. Data sharing and privacy", styles["H1"]))
    story.append(P(
        "This feature is useful only if it is boring from a privacy point of view. The rule is: <b>aggregates and exception IDs cross the boundary; personal ledgers do not.</b>",
        styles["Body"],
    ))
    priv = [
        [P("Nidhi has", th), P("Budget AI is allowed to receive", th)],
        [P("Full payslip, GPF passbook, APGLI policy, HR file", td), P("No", td)],
        [P("Aadhaar, PAN, bank account, mobile", td), P("No", td)],
        [P("Employee chat history", td), P("No", td)],
        [P("DDO-month totals for salary / arrear / pension / GPF / APGLI", td), P("Yes", td)],
        [P("Headcount and exception CFMS IDs", td), P("Yes", td)],
        [P("Bill number for “where is my salary”", td), P("Yes — that employee only, under their token", td)],
    ]
    story.append(table(priv, [95 * mm, W - 95 * mm]))
    story.append(P("Table 11. Data that may and may not cross.", styles["Caption"]))
    story.append(P(
        "Role matrix: an employee asking Budget AI “how much salary budget is left for my DDO?” is refused. That is a DDO question. "
        "Budget AI never writes into payroll, e-SR, leave or GPF. Nidhi never learns HOA, PD or receipts. "
        "DPDP: the employee can be shown what was retrieved about them (bill status). DDO cards are official records, same retention as finance (suggested 8 years, aligned to CFMS).",
        styles["Body"],
    ))

    # 9. PILOT
    story.append(P("9. Proposed pilot (four weeks, one DDO)", styles["H1"]))
    story.append(P(
        "We are not asking for a programme. We are asking for a time-boxed trial that can fail cheaply.",
        styles["Body"],
    ))
    pilot = [
        [P("Week", th), P("Work", th), P("Exit check", th)],
        [P("Week 1", tdb), P("Freeze MCP tool schemas and allow-lists. Role matrix. Audit log format. Identify one DDO + one treasury. Read access only.", td), P("One-page contract signed by both tech leads.", td)],
        [P("Week 2", tdb), P("nidhi-ess-mcp and cfms-ledger-mcp live on non-prod (Stateless HTTP). No SAP write. Cache DDO-month aggregates until payroll close (protect HANA).", td), P("Budget AI can call nidhi_get_liability; Nidhi can call cfms_get_bill_status.", td)],
        [P("Week 3", tdb), P("Skill A on Nidhi (where is my salary). Skill B on Budget AI (salary_fit on 010 only).", td), P("DDO can open the cover card. One employee test ID gets bill status.", td)],
        [P("Week 4", tdb), P("DDO and treasury use it on live month. Capture SRTS and BAC numbers. Optional: GPF break on the same DDO if Skill B is stable.", td), P("Review with manager: keep, iterate, or stop.", td)],
    ]
    story.append(table(pilot, [22 * mm, 88 * mm, W - 110 * mm]))
    story.append(P("Table 12. Four-week pilot — salary 010 first, GPF only if salary cover works.", styles["Caption"]))
    story.append(P(
        "<b>In:</b> one DDO, one month, HOA 010, read-only, Skills A and B. "
        "<b>Stretch if stable:</b> Skill C (GPF) on the same DDO. "
        "<b>Out:</b> PD, receipts, works, employee budget view, SAP write, second DDO, GPU, new LLM.",
        styles["Body"],
    ))

    # 10. METRICS
    story.append(P("10. How we will know it worked", styles["H1"]))
    story.append(P("If these four do not move, the integration is only architecture and we should stop.", styles["Body"]))
    met = [
        [P("Metric", th), P("How measured", th), P("Direction we want", th)],
        [P("SRTS tickets “salary not credited” for the pilot DDO", td), P("SRTS category count, same month last year vs pilot month", td), P("Down", td)],
        [P("Salary bills rejected / returned on BAC for that DDO", td), P("CFMS bill log", td), P("Down (shortfall seen before submit)", td)],
        [P("Time for DDO to know 010 cover", td), P("DDO feedback: minutes vs current Excel", td), P("From hours / guesswork to one card", td)],
        [P("GPF “deducted, not remitted” exceptions open after T+7", td), P("Skill C exception list, if enabled", td), P("Towards zero", td)],
    ]
    story.append(table(met, [58 * mm, 70 * mm, W - 128 * mm]))
    story.append(P("Table 13. Success metrics for the pilot review.", styles["Caption"]))

    # 11. RISKS
    story.append(P("11. Risks and how we will handle them", styles["H1"]))
    risks = [
        [P("Risk", th), P("Mitigation", th)],
        [P("Load on SAP HANA from chat traffic", td), P("DDO-month aggregate, cached until payroll close. No per-message SQL on production HANA. Read replica if available.", td)],
        [P("Wrong cover number on salary day", td), P("Card is advisory. Human submits the bill. We show source (Nidhi liability vs CFMS 010) so the DDO can disagree.", td)],
        [P("Privacy / DPDP / Aadhaar", td), P("No PII in Budget AI. Employee token scoped to own CFMS ID. Role check on every tool call.", td)],
        [P("Two languages, two teams, delay", td), P("Two MCP servers, HTTP. Contract in week 1. No shared runtime. Same pattern as CFMS talking to NIDHI.", td)],
        [P("Scope creep into PD, works, new portal", td), P("Table 4 is binding for the pilot. Any extra skill needs a new note.", td)],
        [P("User ignores the card", td), P("Pilot DDO nominated; we sit with them for one salary cycle. If they do not open it, we stop — not a training campaign.", td)],
    ]
    story.append(table(risks, [58 * mm, W - 58 * mm]))
    story.append(P("Table 14. Risks the manager is likely to raise.", styles["Caption"]))

    # 12. DECISION
    story.append(P("12. Decision requested", styles["H1"]))
    story.append(P("Approval is requested for the following, and only the following:", styles["Body"]))
    story.append(P("1. A <b>4-week pilot</b> on one DDO and one treasury, Skills A and B, HOA 010, read-only.", styles["BulletBody"]))
    story.append(P("2. Permission to stand up <b>two internal read-only MCP servers</b> (nidhi-ess-mcp and cfms-ledger-mcp), using existing SSO, with audit logging.", styles["BulletBody"]))
    story.append(P("3. Nomination of <b>one DDO and one treasury officer</b> who will actually use the cards and give feedback.", styles["BulletBody"]))
    story.append(P("4. A <b>review meeting</b> at the end of week 4 against Table 13 — keep, iterate, or stop.", styles["BulletBody"]))
    story.append(Spacer(1, 6))
    story.append(P(
        "We are not requesting a new product name, a new budget head, GPU, a rewrite, or write access to SAP.",
        styles["Body"],
    ))

    story.append(Spacer(1, 8))
    story.append(HLine(GOLD, 1.4, W))
    story.append(Spacer(1, 8))

    # ANNEX
    story.append(P("Annexure A — Thirty-second pitch (for the meeting)", styles["H1"]))
    story.append(Callout(
        "Sir, Nidhi already knows who must be paid and what was cut from the slip — salary, GPF, APGLI, pension. "
        "Budget AI already knows whether the HOA can pay and whether that cut reached Public Account. "
        "Today those two facts never meet, so employees raise SRTS tickets and DDOs fail salary bills. "
        "This is not a new chatbot. It is a join of the two products we already built. "
        "Nidhi stays in Spring AI. Budget stays in LangGraph. They call each other as MCP tools — two servers, read-only. "
        "We ask for one DDO, one month, read-only.",
        W, LIGHT_GOLD, GOLD, "Say this first — do not open with the stack",
    ))

    story.append(P("Annexure B — If asked “two technologies — is that a problem?”", styles["H1"]))
    story.append(P(
        "No. Nidhi remains Spring AI. Budget AI remains LangGraph. Integration is <b>two MCP servers over Stateless HTTP</b>, not a shared codebase. "
        "Spring AI already has MCP server and client starters. LangGraph uses langchain-mcp-adapters. "
        "We already integrate Java and SAP ABAP in CFMS / NIDHI. This is the same idea: Nidhi exposes nidhi_get_liability; Budget exposes cfms_get_bill_status. Both read-only.",
        styles["Body"],
    ))

    story.append(P("Annexure C — One-line versions by audience", styles["H1"]))
    lines = [
        [P("Audience", th), P("One line", th)],
        [P("Finance / CFMS", td), P("Before salary day, the DDO will know if HOA 010 can cover Nidhi’s actual liability — not last year’s strength.", td)],
        [P("Nidhi / HCM", td), P("When there is no payslip, Nidhi will tell the employee which CFMS bill is pending, instead of sending them to SRTS.", td)],
        [P("Delivery / tech", td), P("Two existing agents, two MCP servers, no rewrite, no SAP write, four-week pilot.", td)],
        [P("CEO / Board", td), P("People ledger and money ledger finally answer the same question: can we pay these people this month, and did the slip-cut reach GPF.", td)],
    ]
    story.append(table(lines, [38 * mm, W - 38 * mm]))
    story.append(P("Table 15. Open with the line that matches who is in the room.", styles["Caption"]))

    story.append(P("Annexure D — Glossary (for non-CFMS readers)", styles["H1"]))
    gloss = [
        [P("Term", th), P("Meaning in this note", th)],
        [P("Nidhi", td), P("APCFSS employee portal (nidhi.apcfss.in): payslip, ESS, GPF, APGLI, pension, HR.", td)],
        [P("CFMS", td), P("Comprehensive Financial Management System — SAP S/4HANA public finance of GoAP, run by APCFSS.", td)],
        [P("DDO", td), P("Drawing and Disbursing Officer — submits bills for an office.", td)],
        [P("HOA 010 / 040 / 020", td), P("Heads of Account: salaries / pensionary charges / wages.", td)],
        [P("BAC", td), P("Budget Availability Check — CFMS will not pass a bill if the HOA has no cover.", td)],
        [P("Public Account", td), P("Government as banker (GPF and similar). Not the Consolidated Fund. Budget AI already queries it.", td)],
        [P("PD account", td), P("Personal Deposit account. In Budget AI already. Not part of this Nidhi join.", td)],
        [P("SRTS", td), P("APCFSS support / ticketing for CFMS and Nidhi users.", td)],
        [P("Spring AI", td), P("Java framework used by Nidhi ESS AI. Also hosts nidhi-ess-mcp.", td)],
        [P("LangGraph", td), P("Python agent framework used by Budget AI.", td)],
        [P("MCP", td), P("Model Context Protocol — standard way an agent discovers and calls tools on another service over HTTP.", td)],
        [P("nidhi-ess-mcp", td), P("MCP server we will build on Spring AI. Exposes DDO-month liability (not payslips) to Budget AI.", td)],
        [P("cfms-ledger-mcp", td), P("MCP server we will build in Python. Exposes bill status to Nidhi and HOA/pending/PA tools to Budget AI.", td)],
    ]
    story.append(table(gloss, [42 * mm, W - 42 * mm]))
    story.append(P("Table 16. Terms used in this note.", styles["Caption"]))

    story.append(Spacer(1, 10))
    story.append(HLine(NAVY, 1.2, W))
    story.append(Spacer(1, 8))
    story.append(P(
        "Prepared for internal discussion at APCFSS, Mangalagiri. "
        "This note does not commit Finance Department, DTA or any DDO until the pilot is approved. "
        "Figures in the sample cards (Rs.1.12 crore, bill 77821, 86 slips) are illustrations, not live data.",
        styles["FooterNote"],
    ))
    story.append(P(
        "Contact for this note: Nidhi ESS AI team and Budget AI team, APCFSS.",
        styles["FooterNote"],
    ))

    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print("Wrote", OUT)


if __name__ == "__main__":
    build()
