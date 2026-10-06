const express = require("express");
const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} = require("docx");

const auth = require("../middleware/auth");

function formatResumeDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})$/);
  if (!match) return String(value);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
const { getResume } = require("./resumes");

const router = express.Router();

function safe(v) {
  return String(v || "");
}

function fileName(title, extension) {
  return `${safe(title || "resume")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")}.${extension}`;
}

/* =========================================================
   PDF EXPORT
========================================================= */

router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const r = await getResume(req.params.id, req.user.id);

    if (!r) {
      return res.status(404).json({
        message: "Resume not found"
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName(r.title, "pdf")}"`
    );

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 45,
        bottom: 45,
        left: 50,
        right: 50
      },
      bufferPages: true
    });

    doc.pipe(res);

    /* ================= HEADER ================= */

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#172033")
      .text(safe(r.title || "Your Name"), {
        align: "center"
      });

    const contact = [
      r.phone,
      r.email,
      r.location,
      r.linkedin_url,
      r.github_url,
      r.portfolio_url
    ].filter(Boolean);

    if (contact.length) {
      doc
        .moveDown(0.3)
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#555555")
        .text(contact.join(" | "), {
          align: "center"
        });
    }

    doc.moveDown(1);

    /* ================= SUMMARY ================= */

    pdfSection(doc, "PROFESSIONAL SUMMARY");

    if (r.summary) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(safe(r.summary), {
          align: "left",
          lineGap: 2
        });

      doc.moveDown(0.7);
    }

    /* ================= OBJECTIVE ================= */

    if (r.objective) {
      pdfSection(doc, "OBJECTIVE");

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(safe(r.objective), {
          lineGap: 2
        });

      doc.moveDown(0.7);
    }

    /* ================= SKILLS ================= */

    if (r.skills && r.skills.length) {
      pdfSection(doc, "SKILLS");

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(
          r.skills
            .map((s) => safe(s.name))
            .filter(Boolean)
            .join("  •  "),
          {
            lineGap: 3
          }
        );

      doc.moveDown(0.8);
    }

    /* ================= EXPERIENCE ================= */

    if (r.experience && r.experience.length) {
      pdfSection(doc, "EXPERIENCE");

      r.experience.forEach((e) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#172033")
          .text(safe(e.position || "Position"));

        if (e.company) {
          doc.moveDown(0.08).font("Helvetica-Bold").fontSize(9.5).fillColor("#555555").text(safe(e.company));
        }
        if (e.subheading) {
          doc.moveDown(0.08).font("Helvetica-Oblique").fontSize(9).fillColor("#666666").text(safe(e.subheading));
        }

        const dates = e.current_job
          ? (formatResumeDate(e.start_date) ? `${formatResumeDate(e.start_date)} - Present` : "Present")
          : [formatResumeDate(e.start_date), formatResumeDate(e.end_date)].filter(Boolean).join(" - ");

        if (dates) {
          doc
            .moveDown(0.15)
            .font("Helvetica-Oblique")
            .fontSize(9)
            .fillColor("#666666")
            .text(dates);
        }

        if (e.description) {
          doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#333333")
            .text(safe(e.description), {
              lineGap: 2
            });
        }

        doc.moveDown(0.65);
      });
    }

    /* ================= PROJECTS ================= */

    if (r.projects && r.projects.length) {
      pdfSection(doc, "PROJECTS");

      r.projects.forEach((p) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#172033")
          .text(safe(p.title || "Project"));

        if (p.technologies) {
          doc
            .moveDown(0.15)
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#555555")
            .text(`Technologies: ${safe(p.technologies)}`);
        }

        if (p.description) {
          doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#333333")
            .text(safe(p.description), {
              lineGap: 2
            });
        }

        if (p.project_url) {
          doc
            .moveDown(0.15)
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#444444")
            .text(safe(p.project_url));
        }

        doc.moveDown(0.65);
      });
    }

    /* ================= EDUCATION ================= */

    if (r.education && r.education.length) {
      pdfSection(doc, "EDUCATION");

      r.education.forEach((e) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#172033")
          .text(
            `${safe(e.degree || "Degree")} — ${safe(
              e.institution || "Institution"
            )}`
          );

        const educationDetails = [
          e.field,
          e.start_year && e.end_year
            ? `${formatResumeDate(e.start_year)} - ${formatResumeDate(e.end_year)}`
            : formatResumeDate(e.start_year) || formatResumeDate(e.end_year),
          e.grade
        ]
          .filter(Boolean)
          .join(" | ");

        if (educationDetails) {
          doc
            .moveDown(0.15)
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#555555")
            .text(educationDetails);
        }

        doc.moveDown(0.55);
      });
    }

    /* ================= PAGE NUMBERS ================= */

    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#888888")
        .text(`Page ${i + 1} of ${pages.count}`, 50, 800, {
          align: "center",
          width: 495
        });
    }

    doc.end();
  } catch (error) {
    console.error("PDF EXPORT ERROR:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "PDF export failed"
      });
    }
  }
});


/* =========================================================
   PDF SECTION HEADER
========================================================= */

function pdfSection(doc, title) {
  doc
    .moveDown(0.3)
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#172033")
    .text(title);

  doc
    .moveDown(0.15)
    .strokeColor("#aaaaaa")
    .lineWidth(0.7)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();

  doc.moveDown(0.35);
}


/* =========================================================
   DOCX EXPORT
========================================================= */

router.get("/:id/docx", auth, async (req, res) => {
  try {
    const r = await getResume(req.params.id, req.user.id);

    if (!r) {
      return res.status(404).json({
        message: "Resume not found"
      });
    }

    const children = [];

    /* ================= HEADER ================= */

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 100
        },
        children: [
          new TextRun({
            text: safe(r.title || "Your Name"),
            bold: true,
            size: 40,
            color: "172033"
          })
        ]
      })
    );

    const contact = [
      r.phone,
      r.email,
      r.location,
      r.linkedin_url,
      r.github_url,
      r.portfolio_url
    ]
      .filter(Boolean)
      .join(" | ");

    if (contact) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 250
          },
          children: [
            new TextRun({
              text: contact,
              size: 18,
              color: "555555"
            })
          ]
        })
      );
    }

    /* ================= SUMMARY ================= */

    addDocxSection(
      children,
      "PROFESSIONAL SUMMARY",
      r.summary
    );

    /* ================= OBJECTIVE ================= */

    addDocxSection(
      children,
      "OBJECTIVE",
      r.objective
    );

    /* ================= SKILLS ================= */

    if (r.skills && r.skills.length) {
      addDocxSection(
        children,
        "SKILLS",
        r.skills
          .map((s) => safe(s.name))
          .filter(Boolean)
          .join("  •  ")
      );
    }

    /* ================= EXPERIENCE ================= */

    if (r.experience && r.experience.length) {
      addDocxHeading(children, "EXPERIENCE");

      r.experience.forEach((e) => {
        children.push(
          new Paragraph({
            spacing: {
              before: 100,
              after: 30
            },
            children: [
              new TextRun({
                text: safe(e.position || "Position"),
                bold: true,
                size: 22,
                color: "172033"
              })
            ]
          })
        );

        if (e.company) {
          children.push(new Paragraph({ spacing: { after: 25 }, children: [new TextRun({ text: safe(e.company), bold: true, size: 18, color: "555555" })] }));
        }
        if (e.subheading) {
          children.push(new Paragraph({ spacing: { after: 25 }, children: [new TextRun({ text: safe(e.subheading), italics: true, size: 17, color: "666666" })] }));
        }

        const dates = e.current_job
          ? (formatResumeDate(e.start_date) ? `${formatResumeDate(e.start_date)} - Present` : "Present")
          : [formatResumeDate(e.start_date), formatResumeDate(e.end_date)].filter(Boolean).join(" - ");

        if (dates) {
          children.push(
            new Paragraph({
              spacing: {
                after: 50
              },
              children: [
                new TextRun({
                  text: dates,
                  italics: true,
                  size: 17,
                  color: "666666"
                })
              ]
            })
          );
        }

        if (e.description) {
          children.push(
            new Paragraph({
              spacing: {
                after: 140,
                line: 276
              },
              children: [
                new TextRun({
                  text: safe(e.description),
                  size: 19,
                  color: "333333"
                })
              ]
            })
          );
        }
      });
    }

    /* ================= PROJECTS ================= */

    if (r.projects && r.projects.length) {
      addDocxHeading(children, "PROJECTS");

      r.projects.forEach((p) => {
        children.push(
          new Paragraph({
            spacing: {
              before: 100,
              after: 40
            },
            children: [
              new TextRun({
                text: safe(p.title || "Project"),
                bold: true,
                size: 22,
                color: "172033"
              })
            ]
          })
        );

        if (p.technologies) {
          children.push(
            new Paragraph({
              spacing: {
                after: 40
              },
              children: [
                new TextRun({
                  text: `Technologies: ${safe(p.technologies)}`,
                  bold: true,
                  size: 17,
                  color: "555555"
                })
              ]
            })
          );
        }

        if (p.description) {
          children.push(
            new Paragraph({
              spacing: {
                after: 80,
                line: 276
              },
              children: [
                new TextRun({
                  text: safe(p.description),
                  size: 19,
                  color: "333333"
                })
              ]
            })
          );
        }

        if (p.project_url) {
          children.push(
            new Paragraph({
              spacing: {
                after: 100
              },
              children: [
                new TextRun({
                  text: safe(p.project_url),
                  size: 17,
                  color: "444444"
                })
              ]
            })
          );
        }
      });
    }

    /* ================= EDUCATION ================= */

    if (r.education && r.education.length) {
      addDocxHeading(children, "EDUCATION");

      r.education.forEach((e) => {
        children.push(
          new Paragraph({
            spacing: {
              before: 100,
              after: 40
            },
            children: [
              new TextRun({
                text: `${safe(e.degree || "Degree")} — ${safe(
                  e.institution || "Institution"
                )}`,
                bold: true,
                size: 22,
                color: "172033"
              })
            ]
          })
        );

        const details = [
          e.field,
          e.start_year && e.end_year
            ? `${formatResumeDate(e.start_year)} - ${formatResumeDate(e.end_year)}`
            : formatResumeDate(e.start_year) || formatResumeDate(e.end_year),
          e.grade
        ]
          .filter(Boolean)
          .join(" | ");

        if (details) {
          children.push(
            new Paragraph({
              spacing: {
                after: 100
              },
              children: [
                new TextRun({
                  text: details,
                  size: 17,
                  color: "555555"
                })
              ]
            })
          );
        }
      });
    }

    /* ================= DOCUMENT ================= */

    const document = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Arial"
            }
          }
        }
      },

      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 900,
                right: 900
              }
            }
          },

          children
        }
      ]
    });

    const buffer = await Packer.toBuffer(document);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName(r.title, "docx")}"`
    );

    res.send(buffer);

  } catch (error) {
    console.error("DOCX EXPORT ERROR:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "DOCX export failed"
      });
    }
  }
});


/* =========================================================
   DOCX HELPERS
========================================================= */

function addDocxHeading(children, title) {
  children.push(
    new Paragraph({
      spacing: {
        before: 220,
        after: 80
      },
      border: {
        bottom: {
          color: "AAAAAA",
          space: 4,
          style: BorderStyle.SINGLE,
          size: 6
        }
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 25,
          color: "172033"
        })
      ]
    })
  );
}

function addDocxSection(children, title, text) {
  if (!text) return;

  addDocxHeading(children, title);

  children.push(
    new Paragraph({
      spacing: {
        after: 140,
        line: 276
      },
      children: [
        new TextRun({
          text: safe(text),
          size: 19,
          color: "333333"
        })
      ]
    })
  );
}


module.exports = router;