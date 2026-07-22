// Generic CSV parsing/serialization helpers shared by the schedule importer
// and the Classroom task importer. Attaches admin.csv.
(function () {
  'use strict';

  var admin = window.DIPCC_ADMIN;
  if (!admin) return;

  function detectDelimiter(text) {
    var counts = { ',': 0, ';': 0, '\t': 0 };
    var inQuotes = false;

    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      var next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        break;
      } else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, char)) {
        counts[char] += 1;
      }
    }

    return Object.keys(counts).reduce(function (best, delimiter) {
      return counts[delimiter] > counts[best] ? delimiter : best;
    }, ',');
  }

  function parse(text, delimiter) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    delimiter = delimiter || detectDelimiter(text);

    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      var next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  }

  function escapeValue(value) {
    value = String(value || '');
    return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  }

  // Maps header cells to canonical field names via headerMap. When no known
  // header is present, rows are read positionally in `fields` order.
  function mapColumns(rows, fields, headerMap) {
    var headers = rows[0].map(normalizeHeader);
    var indexes = {};
    var hasHeader = false;

    headers.forEach(function (header, index) {
      if (headerMap[header]) {
        indexes[headerMap[header]] = index;
        hasHeader = true;
      }
    });

    if (!hasHeader) {
      fields.forEach(function (field, index) {
        indexes[field] = index;
      });
    }

    return {
      indexes: indexes,
      dataRows: hasHeader ? rows.slice(1) : rows
    };
  }

  function getField(row, indexes, field) {
    var index = indexes[field];
    return typeof index === 'number' ? row[index] || '' : '';
  }

  function download(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(escapeValue).join(',');
    }).join('\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function readFile(fileInput) {
    return new Promise(function (resolve, reject) {
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;

      if (!file) {
        reject(new Error('Choose a CSV file first.'));
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        resolve(parse(String(reader.result || '')));
      };
      reader.onerror = function () {
        reject(new Error('Could not read that CSV file.'));
      };
      reader.readAsText(file);
    });
  }

  admin.csv = {
    parse: parse,
    normalizeHeader: normalizeHeader,
    escapeValue: escapeValue,
    mapColumns: mapColumns,
    getField: getField,
    download: download,
    readFile: readFile
  };
})();
