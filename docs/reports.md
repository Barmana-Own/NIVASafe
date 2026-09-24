# Reports

The API can still generate tenant-authorized FMEA PDF, structured XLSX and DOCX files for backward compatibility, but the authenticated panel intentionally exposes only XLSX and DOCX report downloads. Names follow the safe `NIVASafe-{type}` download convention. Excel workbooks include dedicated report, summary, process/factor and action sheets as applicable; Word downloads are valid Office Open XML packages. Print CSS repeats table headers and avoids row breaks. Persian production PDFs should mount an approved Persian font and register it with PDFKit.
