const fs = require('fs');
const file = 'c:/Users/Gokila/Downloads/roadwatch/src/pages/Admin/Admin.jsx';
let content = fs.readFileSync(file, 'utf8');

const listTarget = '<SeverityBadge severity={report.severity} />';
const listReplacement = `<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                               {report.supportersCount > 1 && (
                                 <span className="text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                                   {report.supportersCount} Signals
                                 </span>
                               )}
                               <SeverityBadge severity={report.severity} />
                             </div>`;

content = content.replace(listTarget, listReplacement);

const metaTarget = /<h3 className="text-lg font-semibold mb-2">\{selectedReport\.title\}<\/h3>\s*<p className="detail-description">/g;
const metaReplacement = `<div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                       <h3 className="text-lg font-semibold m-0">{selectedReport.title}</h3>
                       {selectedReport.supportersCount > 1 && (
                         <span className="text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444450' }}>
                           {selectedReport.supportersCount} CITIZEN SIGNALS
                         </span>
                       )}
                     </div>
                     <p className="detail-description">`;

content = content.replace(metaTarget, metaReplacement);

fs.writeFileSync(file, content);
console.log('Admin UI updated');
