// import React, { useState, useEffect } from "react";
// import Papa from "papaparse";
// import ExcelJS from "exceljs";
// import { saveAs } from "file-saver";

// const MeetReportViewer = () => {
//   const [reuniones, setReuniones] = useState([]);
//   const [materiasMap, setMateriasMap] = useState({});
//   const [horarios, setHorarios] = useState([]);

//   const dias = [
//     "domingo",
//     "lunes",
//     "martes",
//     "miércoles",
//     "jueves",
//     "viernes",
//     "sábado",
//   ];

//   const formatearFechaHora24 = (fechaObj) => {
//     const fecha = new Date(fechaObj);
//     const diaSemana = dias[fecha.getDay()];
//     const dia = String(fecha.getDate()).padStart(2, "0");
//     const mes = String(fecha.getMonth() + 1).padStart(2, "0");
//     const anio = fecha.getFullYear();
//     const horas = String(fecha.getHours()).padStart(2, "0");
//     const minutos = String(fecha.getMinutes()).padStart(2, "0");
//     const segundos = String(fecha.getSeconds()).padStart(2, "0");
//     return `${diaSemana} ${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
//   };

//   useEffect(() => {
//     fetch("/archivo/materias.csv")
//       .then((res) => res.text())
//       .then((text) => {
//         const parsed = Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//         }).data;
//         const map = {};
//         parsed.forEach((row) => {
//           const url = row["Código de reunión"];
//           const code = url
//             ?.split("/")
//             .pop()
//             ?.replace(/[^a-z0-9]/gi, "")
//             .toLowerCase();
//           if (code) {
//             map[code] = {
//               codigoMateria: row["Código de materia"],
//               materia: row["Materia"],
//             };
//           }
//         });
//         setMateriasMap(map);
//       });

//     fetch("/archivo/horarios.csv")
//       .then((res) => res.text())
//       .then((text) => {
//         const parsed = Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//         }).data;
//         setHorarios(parsed);
//       });
//   }, []);

//   const parseHorario = (str) => {
//     if (!str) return null;
//     const [inicio, fin] = str.split(" a ");
//     const [h1, m1] = inicio.split(":").map(Number);
//     const [h2, m2] = fin.split(":").map(Number);
//     return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
//   };

//   const handleCSVUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: ({ data }) => processDatos(data),
//     });
//   };

//   const processDatos = (data) => {
//     const grupos = {};
//     data.forEach((row) => {
//       const idConferencia = row["ID de conferencia"];
//       const codigoRaw = row["Código de reunión"]
//         ?.replace(/[^a-z0-9]/gi, "")
//         .toLowerCase();
//       const inicioStr = row["Hora de inicio"];
//       const durSec = parseInt(row["Duración (segundos)"], 10) || 0;
//       if (!idConferencia || !codigoRaw || !materiasMap[codigoRaw] || !inicioStr)
//         return;

//       const inicio = new Date(inicioStr);
//       const fin = new Date(inicio.getTime() + durSec * 1000);

//       if (!grupos[idConferencia]) {
//         grupos[idConferencia] = {
//           codigoReunion: codigoRaw,
//           inicioMin: inicio,
//           finMax: fin,
//           participantes: new Set(),
//         };
//       } else {
//         if (inicio < grupos[idConferencia].inicioMin)
//           grupos[idConferencia].inicioMin = inicio;
//         if (fin > grupos[idConferencia].finMax)
//           grupos[idConferencia].finMax = fin;
//       }
//       grupos[idConferencia].participantes.add(row["Nombre del actor"]);
//     });

//     const resultado = Object.entries(grupos).map(([id, g]) => {
//       const durMs = g.finMax - g.inicioMin;
//       const durMin = Math.round(durMs / 60000);
//       const horas = Math.floor(durMin / 60);
//       const mins = durMin % 60;
//       const code = g.codigoReunion;
//       const link = `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}`;
//       const mat = materiasMap[code] || {};
//       return {
//         idConferencia: id,
//         codigoMateria: mat.codigoMateria,
//         materia: mat.materia,
//         link,
//         inicio: formatearFechaHora24(g.inicioMin),
//         fin: formatearFechaHora24(g.finMax),
//         duracion: `${horas}h ${mins}m`,
//         participantes: g.participantes.size,
//         codigoRaw: code,
//         fechaInicio: g.inicioMin,
//       };
//     });

//     resultado.forEach((r) => {
//       const fecha = r.fechaInicio;
//       const diaTexto = dias[fecha.getDay()];
//       const horaMin = fecha.getHours() * 60 + fecha.getMinutes();

//       const docentes = horarios.filter((h) => {
//         const codeH = h.lugar_v
//           ?.split("/")
//           .pop()
//           ?.replace(/[^a-z0-9]/gi, "")
//           .toLowerCase();
//         return codeH === r.codigoRaw;
//       });

//       let asistencia = "No";
//       let legajo = "";
//       let horarioEsperado = "";

//       for (let d of docentes) {
//         const esperado = parseHorario(d[diaTexto]);
//         if (esperado) {
//           horarioEsperado = `${diaTexto} ${d[diaTexto]}`;
//         }
//         if (esperado && horaMin >= esperado.inicio && horaMin <= esperado.fin) {
//           asistencia = "Sí";
//           legajo = d.leg;
//           break;
//         }
//       }

//       r.asistencia = asistencia;
//       r.legajo = legajo;
//       r.horarioEsperado = horarioEsperado;
//     });

//     const ordenado = resultado.sort((a, b) => {
//       if (a.codigoMateria < b.codigoMateria) return -1;
//       if (a.codigoMateria > b.codigoMateria) return 1;
//       return new Date(a.fechaInicio) - new Date(b.fechaInicio);
//     });

//     setReuniones(ordenado);
//   };

//   const exportToExcel = async () => {
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Meet Report");
//     sheet.columns = [
//       { header: "Código materia", key: "codigoMateria", width: 15 },
//       { header: "Materia", key: "materia", width: 20 },
//       { header: "Legajo", key: "legajo", width: 10 },
//       { header: "Reunión", key: "linkCompleto", width: 40 },
//       { header: "Inicio", key: "inicio", width: 30 },
//       { header: "Fin", key: "fin", width: 30 },
//       { header: "Horario esperado", key: "horarioEsperado", width: 25 },
//       { header: "¿Asistió en horario?", key: "asistencia", width: 20 },
//       { header: "Duración", key: "duracion", width: 15 },
//       { header: "Participantes", key: "participantes", width: 15 },
//     ];

//     reuniones.forEach((row) => {
//       sheet.addRow({
//         ...row,
//         linkCompleto: `https://meet.google.com/${row.link}`,
//       });
//     });

//     const buf = await workbook.xlsx.writeBuffer();
//     saveAs(
//       new Blob([buf], { type: "application/octet-stream" }),
//       "meet_report.xlsx"
//     );
//   };

//   return (
//     <div className="container mt-4">
//       <h2>Reporte de Reuniones de Meet</h2>

//       <div className="row mb-3 mt-3">
//         <div className="col-md-6">
//           <input
//             type="file"
//             accept=".csv"
//             className="form-control"
//             onChange={handleCSVUpload}
//           />
//         </div>
//       </div>

//       {reuniones.length > 0 && (
//         <>
//           <div className="mb-3">
//             <button className="btn btn-success" onClick={exportToExcel}>
//               Exportar a Excel
//             </button>
//           </div>

//           <table className="table table-bordered">
//             <thead className="table-light">
//               <tr>
//                 <th>Código materia</th>
//                 <th>Materia</th>
//                 <th>Legajo</th>
//                 <th>Reunión</th>
//                 <th>Inicio</th>
//                 <th>Fin</th>
//                 <th>Horario esperado</th>
//                 <th>¿Asistió en horario?</th>
//                 <th>Duración</th>
//                 <th>Participantes</th>
//               </tr>
//             </thead>
//             <tbody>
//               {reuniones.map((r, i) => (
//                 <tr key={i}>
//                   <td>{r.codigoMateria}</td>
//                   <td>{r.materia}</td>
//                   <td>{r.legajo || "-"}</td>
//                   <td>{r.link}</td>
//                   <td>{r.inicio}</td>
//                   <td>{r.fin}</td>
//                   <td>{r.horarioEsperado || "-"}</td>
//                   <td>{r.asistencia}</td>
//                   <td>{r.duracion}</td>
//                   <td>{r.participantes}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </>
//       )}
//     </div>
//   );
// };

// export default MeetReportViewer;

// ---------------------------------------------------

//CON FILTRO POR MATERIA

// import React, { useState, useEffect } from "react";
// import Papa from "papaparse";
// import ExcelJS from "exceljs";
// import { saveAs } from "file-saver";

// const MeetReportViewer = () => {
//   const [reuniones, setReuniones] = useState([]);
//   const [materiasMap, setMateriasMap] = useState({});
//   const [horarios, setHorarios] = useState([]);
//   const [filtroMateria, setFiltroMateria] = useState("Todas");

//   const dias = [
//     "domingo",
//     "lunes",
//     "martes",
//     "miércoles",
//     "jueves",
//     "viernes",
//     "sábado",
//   ];

//   const formatearFechaHora24 = (fechaObj) => {
//     const fecha = new Date(fechaObj);
//     const diaSemana = dias[fecha.getDay()];
//     const dia = String(fecha.getDate()).padStart(2, "0");
//     const mes = String(fecha.getMonth() + 1).padStart(2, "0");
//     const anio = fecha.getFullYear();
//     const horas = String(fecha.getHours()).padStart(2, "0");
//     const minutos = String(fecha.getMinutes()).padStart(2, "0");
//     const segundos = String(fecha.getSeconds()).padStart(2, "0");
//     return `${diaSemana} ${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
//   };

//   useEffect(() => {
//     fetch("/archivo/materias.csv")
//       .then((res) => res.text())
//       .then((text) => {
//         const parsed = Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//         }).data;
//         const map = {};
//         parsed.forEach((row) => {
//           const url = row["Código de reunión"];
//           const code = url
//             ?.split("/")
//             .pop()
//             ?.replace(/[^a-z0-9]/gi, "")
//             .toLowerCase();
//           if (code) {
//             map[code] = {
//               codigoMateria: row["Código de materia"],
//               materia: row["Materia"],
//             };
//           }
//         });
//         setMateriasMap(map);
//       });

//     fetch("/archivo/horarios.csv")
//       .then((res) => res.text())
//       .then((text) => {
//         const parsed = Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//         }).data;
//         setHorarios(parsed);
//       });
//   }, []);

//   const parseHorario = (str) => {
//     if (!str) return null;
//     const [inicio, fin] = str.split(" a ");
//     const [h1, m1] = inicio.split(":").map(Number);
//     const [h2, m2] = fin.split(":").map(Number);
//     return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
//   };

//   const handleCSVUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: true,
//       complete: ({ data }) => processDatos(data),
//     });
//   };

//   const processDatos = (data) => {
//     const grupos = {};
//     data.forEach((row) => {
//       const idConferencia = row["ID de conferencia"];
//       const codigoRaw = row["Código de reunión"]
//         ?.replace(/[^a-z0-9]/gi, "")
//         .toLowerCase();
//       const inicioStr = row["Hora de inicio"];
//       const durSec = parseInt(row["Duración (segundos)"], 10) || 0;
//       if (!idConferencia || !codigoRaw || !materiasMap[codigoRaw] || !inicioStr)
//         return;

//       const inicio = new Date(inicioStr);
//       const fin = new Date(inicio.getTime() + durSec * 1000);

//       if (!grupos[idConferencia]) {
//         grupos[idConferencia] = {
//           codigoReunion: codigoRaw,
//           inicioMin: inicio,
//           finMax: fin,
//           participantes: new Set(),
//         };
//       } else {
//         if (inicio < grupos[idConferencia].inicioMin)
//           grupos[idConferencia].inicioMin = inicio;
//         if (fin > grupos[idConferencia].finMax)
//           grupos[idConferencia].finMax = fin;
//       }
//       grupos[idConferencia].participantes.add(row["Nombre del actor"]);
//     });

//     const resultado = Object.entries(grupos).map(([id, g]) => {
//       const durMs = g.finMax - g.inicioMin;
//       const durMin = Math.round(durMs / 60000);
//       const horas = Math.floor(durMin / 60);
//       const mins = durMin % 60;
//       const code = g.codigoReunion;
//       const link = `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}`;
//       const mat = materiasMap[code] || {};
//       return {
//         idConferencia: id,
//         codigoMateria: mat.codigoMateria,
//         materia: mat.materia,
//         link,
//         inicio: formatearFechaHora24(g.inicioMin),
//         fin: formatearFechaHora24(g.finMax),
//         duracion: `${horas}h ${mins}m`,
//         participantes: g.participantes.size,
//         codigoRaw: code,
//         fechaInicio: g.inicioMin,
//       };
//     });

//     resultado.forEach((r) => {
//       const fecha = r.fechaInicio;
//       const diaTexto = dias[fecha.getDay()];
//       const horaMin = fecha.getHours() * 60 + fecha.getMinutes();

//       const docentes = horarios.filter((h) => {
//         const codeH = h.lugar_v
//           ?.split("/")
//           .pop()
//           ?.replace(/[^a-z0-9]/gi, "")
//           .toLowerCase();
//         return codeH === r.codigoRaw;
//       });

//       let asistencia = "No";
//       let legajo = "";
//       let horarioEsperado = "";

//       for (let d of docentes) {
//         const esperado = parseHorario(d[diaTexto]);
//         if (esperado) {
//           horarioEsperado = `${diaTexto} ${d[diaTexto]}`;
//         }
//         if (esperado && horaMin >= esperado.inicio && horaMin <= esperado.fin) {
//           asistencia = "Sí";
//           legajo = d.leg;
//           break;
//         }
//       }

//       r.asistencia = asistencia;
//       r.legajo = legajo;
//       r.horarioEsperado = horarioEsperado;
//     });

//     const ordenado = resultado.sort((a, b) => {
//       if (a.codigoMateria < b.codigoMateria) return -1;
//       if (a.codigoMateria > b.codigoMateria) return 1;
//       return new Date(a.fechaInicio) - new Date(b.fechaInicio);
//     });

//     setReuniones(ordenado);
//   };

//   const exportToExcel = async () => {
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Meet Report");
//     sheet.columns = [
//       { header: "Código materia", key: "codigoMateria", width: 15 },
//       { header: "Materia", key: "materia", width: 20 },
//       { header: "Legajo", key: "legajo", width: 10 },
//       { header: "Reunión", key: "linkCompleto", width: 40 },
//       { header: "Inicio", key: "inicio", width: 30 },
//       { header: "Fin", key: "fin", width: 30 },
//       { header: "Horario esperado", key: "horarioEsperado", width: 25 },
//       { header: "¿Asistió en horario?", key: "asistencia", width: 20 },
//       { header: "Duración", key: "duracion", width: 15 },
//       { header: "Participantes", key: "participantes", width: 15 },
//     ];

//     const datosFiltrados = reuniones.filter((r) =>
//       filtroMateria === "Todas" ? true : r.materia === filtroMateria
//     );

//     datosFiltrados.forEach((row) => {
//       sheet.addRow({
//         ...row,
//         linkCompleto: `https://meet.google.com/${row.link}`,
//       });
//     });

//     const buf = await workbook.xlsx.writeBuffer();
//     saveAs(
//       new Blob([buf], { type: "application/octet-stream" }),
//       "meet_report.xlsx"
//     );
//   };

//   const materiasUnicas = Array.from(
//     new Set(reuniones.map((r) => r.materia))
//   ).sort();

//   return (
//     <div className="container mt-4">
//       <h2>Reporte de Reuniones de Meet</h2>

//       <div className="row mb-3 mt-3">
//         <div className="col-md-6">
//           <input
//             type="file"
//             accept=".csv"
//             className="form-control"
//             onChange={handleCSVUpload}
//           />
//         </div>
//       </div>

//       {reuniones.length > 0 && (
//         <>
//           <div className="row mb-3">
//             <div className="col-md-4">
//               <label className="form-label">Filtrar por materia</label>
//               <select
//                 className="form-select"
//                 value={filtroMateria}
//                 onChange={(e) => setFiltroMateria(e.target.value)}
//               >
//                 <option value="Todas">Todas</option>
//                 {materiasUnicas.map((m, i) => (
//                   <option key={i} value={m}>
//                     {m}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="col-md-4 align-self-end">
//               <button className="btn btn-success" onClick={exportToExcel}>
//                 Exportar a Excel
//               </button>
//             </div>
//           </div>

//           <table className="table table-bordered">
//             <thead className="table-light">
//               <tr>
//                 <th>Código materia</th>
//                 <th>Materia</th>
//                 <th>Legajo</th>
//                 <th>Reunión</th>
//                 <th>Inicio</th>
//                 <th>Fin</th>
//                 <th>Horario esperado</th>
//                 <th>¿Asistió en horario?</th>
//                 <th>Duración</th>
//                 <th>Participantes</th>
//               </tr>
//             </thead>
//             <tbody>
//               {reuniones
//                 .filter((r) =>
//                   filtroMateria === "Todas" ? true : r.materia === filtroMateria
//                 )
//                 .map((r, i) => (
//                   <tr key={i}>
//                     <td>{r.codigoMateria}</td>
//                     <td>{r.materia}</td>
//                     <td>{r.legajo || "-"}</td>
//                     <td>{r.link}</td>
//                     <td>{r.inicio}</td>
//                     <td>{r.fin}</td>
//                     <td>{r.horarioEsperado || "-"}</td>
//                     <td>{r.asistencia}</td>
//                     <td>{r.duracion}</td>
//                     <td>{r.participantes}</td>
//                   </tr>
//                 ))}
//             </tbody>
//           </table>
//         </>
//       )}
//     </div>
//   );
// };

// export default MeetReportViewer;
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const MeetReportViewer = () => {
  const [reuniones, setReuniones] = useState([]);
  const [materiasMap, setMateriasMap] = useState({});
  const [horarios, setHorarios] = useState([]);
  const [filtroMateria, setFiltroMateria] = useState("Todas");

  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  const formatearFechaHora24 = (fechaObj) => {
    const fecha = new Date(fechaObj);
    const diaSemana = dias[fecha.getDay()];
    const diaCapitalizado =
      diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    const horas = String(fecha.getHours()).padStart(2, "0");
    const minutos = String(fecha.getMinutes()).padStart(2, "0");
    const segundos = String(fecha.getSeconds()).padStart(2, "0");
    return `${diaCapitalizado} ${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
  };

  useEffect(() => {
    fetch("/archivo/materias.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        }).data;
        const map = {};
        parsed.forEach((row) => {
          const url = row["Código de reunión"];
          const code = url
            ?.split("/")
            .pop()
            ?.replace(/[^a-z0-9]/gi, "")
            .toLowerCase();
          if (code) {
            map[code] = {
              codigoMateria: row["Código de materia"],
              materia: row["Materia"],
            };
          }
        });
        setMateriasMap(map);
      });

    fetch("/archivo/horarios.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        }).data;
        setHorarios(parsed);
      });
  }, []);

  const parseHorario = (str) => {
    if (!str) return null;
    const [inicio, fin] = str.split(" a ");
    const [h1, m1] = inicio.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => processDatos(data),
    });
  };

  const processDatos = (data) => {
    const grupos = {};
    data.forEach((row) => {
      const idConferencia = row["ID de conferencia"];
      const codigoRaw = row["Código de reunión"]
        ?.replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      const inicioStr = row["Hora de inicio"];
      const durSec = parseInt(row["Duración (segundos)"], 10) || 0;
      if (!idConferencia || !codigoRaw || !materiasMap[codigoRaw] || !inicioStr)
        return;

      const inicio = new Date(inicioStr);
      const fin = new Date(inicio.getTime() + durSec * 1000);

      if (!grupos[idConferencia]) {
        grupos[idConferencia] = {
          codigoReunion: codigoRaw,
          inicioMin: inicio,
          finMax: fin,
          participantes: new Set(),
        };
      } else {
        if (inicio < grupos[idConferencia].inicioMin)
          grupos[idConferencia].inicioMin = inicio;
        if (fin > grupos[idConferencia].finMax)
          grupos[idConferencia].finMax = fin;
      }
      grupos[idConferencia].participantes.add(row["Nombre del actor"]);
    });

    const resultado = Object.entries(grupos).map(([id, g]) => {
      const durMs = g.finMax - g.inicioMin;
      const durMin = Math.round(durMs / 60000);
      const horas = Math.floor(durMin / 60);
      const mins = durMin % 60;
      const code = g.codigoReunion;
      const link = `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}`;
      const mat = materiasMap[code] || {};
      return {
        idConferencia: id,
        codigoMateria: mat.codigoMateria,
        materia: mat.materia,
        link,
        inicio: formatearFechaHora24(g.inicioMin),
        fin: formatearFechaHora24(g.finMax),
        duracion: `${horas}h ${mins}m`,
        participantes: g.participantes.size,
        codigoRaw: code,
        fechaInicio: g.inicioMin,
      };
    });

    resultado.forEach((r) => {
      const fecha = r.fechaInicio;
      const diaTexto = dias[fecha.getDay()];
      const diaCapitalizado =
        diaTexto.charAt(0).toUpperCase() + diaTexto.slice(1);
      const horaMin = fecha.getHours() * 60 + fecha.getMinutes();

      const docentes = horarios.filter((h) => {
        const codeH = h.lugar_v
          ?.split("/")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        return codeH === r.codigoRaw;
      });

      let asistencia = "No";
      let legajo = "";
      let horarioEsperado = "";

      for (let d of docentes) {
        const esperado = parseHorario(d[diaTexto]);
        if (esperado) {
          horarioEsperado = `${diaCapitalizado} ${d[diaTexto]}`;
        }
        if (esperado && horaMin >= esperado.inicio && horaMin <= esperado.fin) {
          asistencia = "Sí";
          legajo = d.leg;
          break;
        }
      }

      r.asistencia = asistencia;
      r.legajo = legajo;
      r.horarioEsperado = horarioEsperado;
    });

    const ordenado = resultado.sort((a, b) => {
      if (a.codigoMateria < b.codigoMateria) return -1;
      if (a.codigoMateria > b.codigoMateria) return 1;
      return new Date(a.fechaInicio) - new Date(b.fechaInicio);
    });

    setReuniones(ordenado);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Meet Report");
    sheet.columns = [
      { header: "Código materia", key: "codigoMateria", width: 15 },
      { header: "Materia", key: "materia", width: 20 },
      { header: "Legajo", key: "legajo", width: 10 },
      { header: "Reunión", key: "linkCompleto", width: 40 },
      { header: "Inicio", key: "inicio", width: 30 },
      { header: "Fin", key: "fin", width: 30 },
      { header: "Horario esperado", key: "horarioEsperado", width: 25 },
      { header: "¿Asistió en horario?", key: "asistencia", width: 20 },
      { header: "Duración", key: "duracion", width: 15 },
      { header: "Participantes", key: "participantes", width: 15 },
    ];

    const datosFiltrados = reuniones.filter((r) =>
      filtroMateria === "Todas" ? true : r.materia === filtroMateria
    );

    datosFiltrados.forEach((row) => {
      sheet.addRow({
        ...row,
        linkCompleto: `https://meet.google.com/${row.link}`,
      });
    });

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      "meet_report.xlsx"
    );
  };

  const materiasUnicas = Array.from(
    new Set(reuniones.map((r) => r.materia))
  ).sort();

  return (
    <div className="container mt-4">
      <h2>Reporte de Reuniones de Meet</h2>

      <div className="row mb-3 mt-3">
        <div className="col-md-6">
          <input
            type="file"
            accept=".csv"
            className="form-control"
            onChange={handleCSVUpload}
          />
        </div>
      </div>

      {reuniones.length > 0 && (
        <>
          <div className="row mb-4 mt-4">
            <div className="col-md-4">
              <h4 className="form-label">Filtrar por materia</h4>
              <select
                className="form-select"
                value={filtroMateria}
                onChange={(e) => setFiltroMateria(e.target.value)}
              >
                <option value="Todas">Todas</option>
                {materiasUnicas.map((m, i) => (
                  <option key={i} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4 align-self-end">
              <button id="botones" className="btn" onClick={exportToExcel}>
                Exportar a Excel
              </button>
            </div>
          </div>

          <table className="table table-bordered">
            <thead className="table-light text-center">
              <tr>
                <th className="fw-bold">Código materia</th>
                <th className="fw-bold">Materia</th>
                <th className="fw-bold">Legajo</th>
                <th className="fw-bold">Reunión</th>
                <th className="fw-bold">Inicio</th>
                <th className="fw-bold">Fin</th>
                <th className="fw-bold">Horario Informado</th>
                <th className="fw-bold">¿Asistió en horario?</th>
                <th className="fw-bold">Duración</th>
                <th className="fw-bold">Participantes</th>
              </tr>
            </thead>
            <tbody>
              {reuniones
                .filter((r) =>
                  filtroMateria === "Todas" ? true : r.materia === filtroMateria
                )
                .map((r, i) => (
                  <tr key={i}>
                    <td className="text-center">{r.codigoMateria}</td>
                    <td className="text-center">{r.materia}</td>
                    <td className="text-center">{r.legajo || "-"}</td>
                    <td className="text-center">{r.link}</td>
                    <td className="text-center">{r.inicio}</td>
                    <td className="text-center">{r.fin}</td>
                    <td className="text-center">{r.horarioEsperado || "-"}</td>
                    <td className="text-center">{r.asistencia}</td>
                    <td className="text-center">{r.duracion}</td>
                    <td className="text-center">{r.participantes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default MeetReportViewer;
