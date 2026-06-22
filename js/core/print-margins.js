/* ZERO V7.4 — Padronização de margens em impressões clínicas */
(function(){
  window.ClinicaPrintMargins = {
    css: `
      <style>
        @media print{
          @page{
            margin-top:4cm;
            margin-right:1.5cm;
            margin-bottom:6cm;
            margin-left:1.5cm;
          }
          body{
            padding:0!important;
          }
          .print-footer,.assinatura,.assinatura-medico{
            page-break-inside:avoid;
          }
        }
      </style>
    `,
    apply(html){
      if(!html || typeof html !== 'string') return html;
      if(html.includes('ZERO V7.4 margem documentos')) return html;
      if(html.includes('</head>')){
        return html.replace('</head>', this.css + '</head>');
      }
      if(html.includes('</style>')){
        return html.replace('</style>', `
          /* ZERO V7.4 margem documentos */
          @media print{@page{margin-top:4cm;margin-right:1.5cm;margin-bottom:6cm;margin-left:1.5cm}body{padding:0!important}}
        </style>`);
      }
      return this.css + html;
    }
  };
})();
