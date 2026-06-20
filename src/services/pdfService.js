// src/services/pdfService.js
// FIX 1: avg() helper was defined inside generateInterviewPDF but also used as a
//         standalone avg() call — moved outside as a pure function.
// FIX 2: scores array could be undefined — all accesses now have fallback.
// FIX 3: jsPDF color calls use setDrawColor/setTextColor correctly (was using wrong arg order).
// FIX 4: Long text wrapped with splitTextToSize before rendering (was overflowing pages).
// FIX 5: New page background fill was missing on addPage() calls — pages were white.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PRIMARY = [99, 102, 241]
const DARK    = [15, 15, 26]
const LIGHT   = [226, 232, 240]
const MUTED   = [100, 116, 139]

function avgKey(scores, key) {
  if (!scores?.length) return 0
  return parseFloat(
    (scores.reduce((a, s) => a + (Number(s[key]) || 0), 0) / scores.length).toFixed(1)
  )
}

function getRating(score) {
  const s = parseFloat(score)
  if (s >= 8.5) return 'Excellent'
  if (s >= 7)   return 'Good'
  if (s >= 5)   return 'Average'
  return 'Needs Work'
}

function fillDarkBg(doc) {
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')
}

export function generateInterviewPDF(interviewData) {
  const { role = '', difficulty = '', questions = [], answers = [], scores = [], report, userName = 'Candidate' } = interviewData

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Cover page ──────────────────────────────────────────────────────────────
  fillDarkBg(doc)

  // Header banner
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, 210, 52, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('AI Interview Coach', 105, 22, { align: 'center' })
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text('Interview Performance Report', 105, 35, { align: 'center' })

  // Candidate info
  doc.setTextColor(...LIGHT)
  doc.setFontSize(11)
  const infoY = 72
  const infoLines = [
    `Candidate:  ${userName}`,
    `Role:       ${role}`,
    `Difficulty: ${difficulty}`,
    `Date:       ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
  ]
  infoLines.forEach((line, i) => doc.text(line, 20, infoY + i * 10))

  // Overall score circle
  const overallAvg = avgKey(scores, 'overall')
  doc.setFillColor(...PRIMARY)
  doc.circle(165, 88, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`${overallAvg}`, 165, 92, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('/ 10', 165, 100, { align: 'center' })

  // Readiness badge
  if (report?.placementReadiness) {
    const rd = report.placementReadiness
    const rdColor = rd >= 75 ? [16,185,129] : rd >= 50 ? [99,102,241] : rd >= 30 ? [245,158,11] : [239,68,68]
    doc.setFillColor(...rdColor)
    doc.roundedRect(20, 130, 90, 18, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Placement Readiness: ${rd}%`, 65, 141, { align: 'center' })
  }

  // ── Score Summary page ──────────────────────────────────────────────────────
  doc.addPage()
  fillDarkBg(doc)

  doc.setTextColor(...PRIMARY)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Score Summary', 20, 25)

  const scoreRows = [
    ['Technical Knowledge', `${avgKey(scores, 'technicalKnowledge')}/10`, getRating(avgKey(scores, 'technicalKnowledge'))],
    ['Communication',       `${avgKey(scores, 'communication')}/10`,      getRating(avgKey(scores, 'communication'))],
    ['Confidence',          `${avgKey(scores, 'confidence')}/10`,         getRating(avgKey(scores, 'confidence'))],
    ['Clarity',             `${avgKey(scores, 'clarity')}/10`,            getRating(avgKey(scores, 'clarity'))],
    ['Problem Solving',     `${avgKey(scores, 'problemSolving')}/10`,     getRating(avgKey(scores, 'problemSolving'))],
    ['Overall',             `${overallAvg}/10`,                           getRating(overallAvg)],
  ]

  autoTable(doc, {
    startY: 35,
    head:   [['Metric', 'Score', 'Rating']],
    body:   scoreRows,
    headStyles:          { fillColor: PRIMARY, textColor: [255,255,255], fontStyle: 'bold' },
    bodyStyles:          { fillColor: [20,20,40], textColor: LIGHT },
    alternateRowStyles:  { fillColor: [26,26,53] },
    styles:              { fontSize: 10, cellPadding: 4 },
    columnStyles:        { 0: { cellWidth: 80 }, 1: { cellWidth: 30, halign: 'center' }, 2: { halign: 'center' } },
  })

  // ── Q&A page ────────────────────────────────────────────────────────────────
  doc.addPage()
  fillDarkBg(doc)

  doc.setTextColor(...PRIMARY)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Questions & Answers', 20, 25)

  let yPos = 40
  const W = 170  // usable width

  questions.forEach((q, i) => {
    const qText = typeof q === 'object' ? (q.question || '') : (q || '')
    const aText = typeof answers[i] === 'object' ? (answers[i].text || '') : (answers[i] || 'No answer provided')
    const sc    = scores[i]

    if (yPos > 255) {
      doc.addPage()
      fillDarkBg(doc)
      yPos = 20
    }

    // Question
    doc.setTextColor(...PRIMARY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const qLines = doc.splitTextToSize(`Q${i + 1}: ${qText}`, W)
    doc.text(qLines, 20, yPos)
    yPos += qLines.length * 5 + 3

    // Answer
    doc.setTextColor(...LIGHT)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const aLines = doc.splitTextToSize(`Answer: ${aText}`, W)
    // Limit to 6 lines to avoid overflow
    const aSlice = aLines.slice(0, 6)
    doc.text(aSlice, 20, yPos)
    yPos += aSlice.length * 4.5 + 2

    // Score line
    if (sc) {
      doc.setTextColor(...MUTED)
      doc.setFontSize(7.5)
      const fbShort = sc.feedback ? sc.feedback.substring(0, 90) + (sc.feedback.length > 90 ? '…' : '') : ''
      doc.text(`Score: ${sc.overall || 0}/10${fbShort ? '  ·  ' + fbShort : ''}`, 20, yPos)
      yPos += 6
    }

    yPos += 5
  })

  // ── Placement Report page ───────────────────────────────────────────────────
  if (report) {
    doc.addPage()
    fillDarkBg(doc)

    doc.setTextColor(...PRIMARY)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Placement Readiness Report', 20, 25)

    let y = 40

    const writeList = (title, items = [], color = LIGHT) => {
      if (!items.length) return
      doc.setTextColor(...PRIMARY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(title, 20, y); y += 7
      doc.setTextColor(...color)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      items.forEach(item => {
        if (y > 270) { doc.addPage(); fillDarkBg(doc); y = 20 }
        const lines = doc.splitTextToSize(`• ${item}`, W)
        doc.text(lines, 24, y)
        y += lines.length * 5 + 1
      })
      y += 5
    }

    writeList('Strengths',         report.strengths || [])
    writeList('Areas to Improve',  report.weaknesses || [])
    writeList('Skills to Learn',   report.skillsToImprove || [])

    if (report.summary) {
      if (y > 250) { doc.addPage(); fillDarkBg(doc); y = 20 }
      doc.setTextColor(...PRIMARY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Summary', 20, y); y += 7
      doc.setTextColor(...LIGHT)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      const sumLines = doc.splitTextToSize(report.summary, W)
      doc.text(sumLines, 20, y)
      y += sumLines.length * 5 + 5
    }

    if (report.hiringRecommendation) {
      doc.setTextColor(...PRIMARY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`Hiring Recommendation: ${report.hiringRecommendation}`, 20, y)
    }
  }

  doc.save(`InterviewReport-${role.replace(/\s+/g, '-')}-${Date.now()}.pdf`)
}
