from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, PolyLine, Circle
import math, os, uuid, re

router = APIRouter()

REPORTS_DIR     = "data/reports"
SAFE_FILENAME   = re.compile(r"^greenlens_report_[0-9a-f]{8}\.pdf$")
FONT_REG        = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD       = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Register fonts once at import time
try:
    pdfmetrics.registerFont(TTFont("DV",  FONT_REG))
    pdfmetrics.registerFont(TTFont("DVB", FONT_BOLD))
except Exception:
    pass  # fonts already registered on subsequent imports

# ── Palette ───────────────────────────────────────────────────────────────────
G_DARK  = colors.HexColor("#1e6b2e")
G_MID   = colors.HexColor("#3b8c3b")
G_CARD  = colors.HexColor("#c8e6c9")
G_CARD2 = colors.HexColor("#b6d9b6")
G_LIGHT = colors.HexColor("#e8f5e9")
ORANGE  = colors.HexColor("#f5a623")
G_ACC   = colors.HexColor("#a5d6a7")
WHITE   = colors.white
GREY_T  = colors.HexColor("#6b6b6b")
GREY_B  = colors.HexColor("#d4e8d4")
DARK_T  = colors.HexColor("#1a1a1a")

W, H = A4
PAD  = 14        # narrow side margin for content
IW   = W - PAD * 2


class ReportRequest(BaseModel):
    name: str
    address: str
    city: str
    capacity_kw: float
    annual_kwh: float
    annual_savings_inr: float
    net_cost_inr: float
    payback_years: float
    subsidy_inr: float
    co2_offset_kg: float


def _inr(v: float) -> str:
    return f"\u20b9{v:,.0f}"

def _ps(name, font="DV", size=10, color=DARK_T, align=0, leading=None):
    return ParagraphStyle(name, fontName=font, fontSize=size, textColor=color,
                          alignment=align, leading=leading or size * 1.4)

def _build_pdf(filepath: str, req: ReportRequest) -> None:
    doc = SimpleDocTemplate(filepath, pagesize=A4,
        rightMargin=0, leftMargin=0, topMargin=-0.5, bottomMargin=44)
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    icon_size = 46
    d = Drawing(icon_size, icon_size)
    d.add(Rect(0, 0, icon_size, icon_size, rx=10, ry=10,
               fillColor=colors.HexColor("#2d8c3e"), strokeColor=None))
    pts = [7,37, 14,13, 23,28, 32,13, 39,37]
    d.add(PolyLine(pts, strokeColor=ORANGE, strokeWidth=4, strokeLineCap=1, strokeLineJoin=1))
    arc_pts = []
    for deg in range(0, 181, 15):
        a = math.radians(deg)
        arc_pts += [23 + 12 * math.cos(math.pi - a),
                    13 + 9  * math.sin(math.pi - a) + 6]
    d.add(PolyLine(arc_pts, strokeColor=G_ACC, strokeWidth=2.5, strokeLineCap=1))
    d.add(Circle(23, 43, 3.8, fillColor=ORANGE, strokeColor=None))

    name_cell = [
        Paragraph("<b>Green</b><font color='#a5d6a7'>Lens</font>",
                  _ps("hn", font="DVB", size=23, color=WHITE, leading=27)),
        Paragraph("SOLAR INTELLIGENCE", _ps("ht", size=7.5, color=G_ACC, leading=10)),
    ]
    cert_cell = Paragraph("Energy Yield Certificate",
                           _ps("hc", font="DVB", size=11, color=WHITE, align=2))

    hdr = Table([[d, name_cell, cert_cell]],
                colWidths=[icon_size+16, W*0.48, W-icon_size-16-W*0.48],
                rowHeights=[2.1*cm])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), G_DARK),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0), (0,-1),  14),
        ("LEFTPADDING",   (1,0), (1,-1),  8),
        ("RIGHTPADDING",  (2,0), (2,-1),  20),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(hdr)

    strip = Table([[""]], colWidths=[W], rowHeights=[4])
    strip.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), ORANGE)]))
    story.append(strip)
    story.append(Spacer(1, 0.3*cm))

    # ── Layout helpers ────────────────────────────────────────────────────────
    def padded(content):
        t = Table([[content]], colWidths=[IW])
        t.setStyle(TableStyle([
            ("LEFTPADDING",   (0,0), (-1,-1), PAD),
            ("RIGHTPADDING",  (0,0), (-1,-1), PAD),
            ("TOPPADDING",    (0,0), (-1,-1), 0),
            ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ]))
        return t

    def divider():
        t = Table([[""]], colWidths=[IW - PAD*2], rowHeights=[0.5])
        t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), GREY_B)]))
        return t

    def sec_label(txt):
        t = Table([[Paragraph(txt, _ps("s"+txt, font="DVB", size=10, color=G_DARK))]],
                  colWidths=[IW - PAD*2])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), G_LIGHT),
            ("LINEBEFORE",    (0,0), (-1,-1), 4, G_DARK),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("TOPPADDING",    (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        return t

    # ── Subtitle ──────────────────────────────────────────────────────────────
    story.append(padded(Paragraph(
        "This document certifies the estimated solar energy yield for the property below. "
        "It may be submitted to banks and NBFCs under PM Surya Ghar Muft Bijli Yojana.",
        _ps("sub", size=9, color=GREY_T, leading=13))))
    story.append(Spacer(1, 0.28*cm))

    # ── Property details ──────────────────────────────────────────────────────
    story.append(padded(sec_label("Property Details")))
    story.append(Spacer(1, 0.08*cm))

    prop = Table(
        [[Paragraph("Owner Name", _ps("l1", font="DVB", size=9.5, color=G_DARK)),
          Paragraph(req.name,      _ps("v1", size=9.5))],
         [Paragraph("Address",    _ps("l2", font="DVB", size=9.5, color=G_DARK)),
          Paragraph(req.address,   _ps("v2", size=9.5))],
         [Paragraph("City",       _ps("l3", font="DVB", size=9.5, color=G_DARK)),
          Paragraph(req.city,      _ps("v3", size=9.5))]],
        colWidths=[4.5*cm, IW - PAD*2 - 4.5*cm])
    prop.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [WHITE, colors.HexColor("#f4fbf4")]),
        ("BACKGROUND",     (0,0), (0,-1),  G_LIGHT),
        ("GRID",           (0,0), (-1,-1), 0.4, GREY_B),
        ("TOPPADDING",     (0,0), (-1,-1), 7),
        ("BOTTOMPADDING",  (0,0), (-1,-1), 7),
        ("LEFTPADDING",    (0,0), (-1,-1), 10),
    ]))
    story.append(padded(prop))
    story.append(Spacer(1, 0.32*cm))
    story.append(padded(divider()))
    story.append(Spacer(1, 0.24*cm))

    # ── Stat cards ────────────────────────────────────────────────────────────
    story.append(padded(sec_label("Energy Yield Projection")))
    story.append(Spacer(1, 0.08*cm))

    stats = [
        ("System Capacity",   f"{req.capacity_kw} kW",          G_DARK),
        ("Annual Generation", f"{req.annual_kwh:.0f} kWh/yr",   G_MID),
        ("Annual Savings",    _inr(req.annual_savings_inr),      G_DARK),
        ("Payback Period",    f"{req.payback_years} yrs",        G_MID),
        ("CO\u2082 Offset",   f"{req.co2_offset_kg:.0f} kg/yr", G_DARK),
        ("Govt Subsidy",      _inr(req.subsidy_inr),             G_MID),
    ]
    cw3 = (IW - PAD*2) / 3

    cards = Table(
        [[Paragraph(s[1], _ps("v"+str(i), font="DVB", size=17, color=s[2], align=1, leading=20))
          for i,s in enumerate(stats[:3])],
         [Paragraph(s[0], _ps("l"+str(i), size=8, color=GREY_T, align=1, leading=10))
          for i,s in enumerate(stats[:3])],
         [Paragraph(s[1], _ps("v"+str(i+3), font="DVB", size=17, color=s[2], align=1, leading=20))
          for i,s in enumerate(stats[3:])],
         [Paragraph(s[0], _ps("l"+str(i+3), size=8, color=GREY_T, align=1, leading=10))
          for i,s in enumerate(stats[3:])]],
        colWidths=[cw3]*3,
        rowHeights=[1.05*cm, 0.52*cm, 1.05*cm, 0.52*cm])
    cards.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,1),  G_CARD),
        ("BACKGROUND",    (0,2), (-1,-1), G_CARD2),
        ("GRID",          (0,0), (-1,-1), 0.5, WHITE),
        ("VALIGN",        (0,0), (-1,0),  "BOTTOM"),
        ("VALIGN",        (0,1), (-1,1),  "TOP"),
        ("VALIGN",        (0,2), (-1,2),  "BOTTOM"),
        ("VALIGN",        (0,3), (-1,3),  "TOP"),
        ("TOPPADDING",    (0,0), (-1,0),  11),
        ("BOTTOMPADDING", (0,0), (-1,0),  2),
        ("TOPPADDING",    (0,1), (-1,1),  2),
        ("BOTTOMPADDING", (0,1), (-1,1),  8),
        ("TOPPADDING",    (0,2), (-1,2),  11),
        ("BOTTOMPADDING", (0,2), (-1,2),  2),
        ("TOPPADDING",    (0,3), (-1,3),  2),
        ("BOTTOMPADDING", (0,3), (-1,3),  9),
    ]))
    story.append(padded(cards))
    story.append(Spacer(1, 0.32*cm))
    story.append(padded(divider()))
    story.append(Spacer(1, 0.24*cm))

    # ── Cost breakdown ────────────────────────────────────────────────────────
    story.append(padded(sec_label("Cost Breakdown")))
    story.append(Spacer(1, 0.08*cm))
    total = req.net_cost_inr + req.subsidy_inr

    def cr(label, sym, amount, bold=False, hi=False):
        fn = "DVB" if bold else "DV"
        fg = G_DARK if hi else DARK_T
        return [Paragraph(label,  _ps("cl"+label, font=fn, size=10, color=fg)),
                Paragraph(sym,    _ps("cs"+label, font=fn, size=10, color=G_MID, align=1)),
                Paragraph(amount, _ps("ca"+label, font=fn, size=10, color=fg, align=2))]

    cost = Table(
        [cr("Total System Cost",      "",       _inr(total)),
         cr("PM Surya Ghar Subsidy",  "\u2212", _inr(req.subsidy_inr)),
         cr("Net Cost After Subsidy", "",       _inr(req.net_cost_inr), bold=True, hi=True)],
        colWidths=[IW - PAD*2 - 7*cm, 1.2*cm, 5.8*cm])
    cost.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),  (-1,-2), WHITE),
        ("BACKGROUND",    (0,-1), (-1,-1), G_LIGHT),
        ("GRID",          (0,0),  (-1,-1), 0.4, GREY_B),
        ("LINEABOVE",     (0,-1), (-1,-1), 1.5, G_DARK),
        ("TOPPADDING",    (0,0),  (-1,-1), 9),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 9),
        ("LEFTPADDING",   (0,0),  (0,-1),  10),
        ("RIGHTPADDING",  (2,0),  (2,-1),  10),
        ("VALIGN",        (0,0),  (-1,-1), "MIDDLE"),
    ]))
    story.append(padded(cost))

    # ── Footer pinned to bottom, centred ─────────────────────────────────────
    line1 = ("Generated by GreenLens using NASA POWER irradiance data and MNRE guidelines. "
             "Actual yields may vary by \u00b110% based on site conditions.")
    line2 = "Submitted to banks/NBFCs under the PM Surya Ghar Muft Bijli Yojana."

    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(G_CARD)
        canvas.rect(0, 0, W, 38, fill=1, stroke=0)
        canvas.setFont("DV", 7.5)
        canvas.setFillColor(GREY_T)
        canvas.drawCentredString(W / 2, 22, line1)
        canvas.drawCentredString(W / 2, 10, line2)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)


@router.post("/report/generate")
def generate_report(req: ReportRequest):
    """Generate a styled PDF energy yield certificate."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    filename = f"greenlens_report_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    try:
        _build_pdf(filepath, req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")
    return {"download_url": f"/api/report/download/{filename}", "filename": filename}


@router.get("/report/download/{filename}")
def download_report(filename: str):
    """Serve a previously generated PDF report."""
    if not SAFE_FILENAME.match(filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path, media_type="application/pdf", filename=filename)