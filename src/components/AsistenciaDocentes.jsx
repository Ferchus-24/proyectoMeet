// import React, { useEffect, useState } from "react";
// import Papa from "papaparse";

// const dias = [
//   "domingo",
//   "lunes",
//   "martes",
//   "miércoles",
//   "jueves",
//   "viernes",
//   "sábado",
// ];

// // Función para parsear "14:30 a 15:30"
// const parseHorario = (str) => {
//   if (!str) return null;
//   const [inicio, fin] = str.split(" a ");
//   const [h1, m1] = inicio.split(":").map(Number);
//   const [h2, m2] = fin.split(":").map(Number);
//   return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
// };

// const AsistenciaDocentes = ({ reuniones }) => {
//   const [horarios, setHorarios] = useState([]);
//   const [resultado, setResultado] = useState([]);

//   useEffect(() => {
//     fetch("/archivo/horarios.csv")
//       .then((res) => res.text())
//       .then((text) => {
//         const data = Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//         }).data;
//         setHorarios(data);
//       });
//   }, []);

//   useEffect(() => {
//     if (horarios.length === 0 || reuniones.length === 0) return;

//     const resultados = [];

//     reuniones.forEach((r) => {
//       const fecha = new Date(r.inicio);
//       const diaTexto = dias[fecha.getDay()];
//       const horaMinutos = fecha.getHours() * 60 + fecha.getMinutes();

//       // Buscar docentes con ese link
//       const docentes = horarios.filter((h) => {
//         const link = h.lugar_v
//           ?.split("/")
//           .pop()
//           ?.replace(/[^a-z0-9]/gi, "")
//           .toLowerCase();
//         return link && r.link.replace(/-/g, "") === link;
//       });

//       docentes.forEach((doc) => {
//         const horarioEsperado = parseHorario(doc[diaTexto]);
//         let asistencia = "No";

//         if (
//           horarioEsperado &&
//           horaMinutos >= horarioEsperado.inicio &&
//           horaMinutos <= horarioEsperado.fin
//         ) {
//           asistencia = "Sí";
//         }

//         resultados.push({
//           legajo: doc.leg,
//           codigoMateria: r.codigoMateria,
//           dia: diaTexto,
//           inicioReal: r.inicio,
//           duracion: r.duracion,
//           horaEsperada: doc[diaTexto],
//           asistencia,
//         });
//       });
//     });

//     setResultado(resultados);
//   }, [horarios, reuniones]);

//   return (
//     <div className="container mt-5">
//       <h3>Verificación de Asistencia Docente</h3>

//       {resultado.length === 0 ? (
//         <p>No hay datos suficientes aún.</p>
//       ) : (
//         <table className="table table-bordered mt-3">
//           <thead className="table-light">
//             <tr>
//               <th>Legajo</th>
//               <th>Código materia</th>
//               <th>Día</th>
//               <th>Hora esperada</th>
//               <th>Inicio real</th>
//               <th>Duración</th>
//               <th>¿Asistió en horario?</th>
//             </tr>
//           </thead>
//           <tbody>
//             {resultado.map((r, i) => (
//               <tr key={i}>
//                 <td>{r.legajo}</td>
//                 <td>{r.codigoMateria}</td>
//                 <td>{r.dia}</td>
//                 <td>{r.horaEsperada || "-"}</td>
//                 <td>{r.inicioReal}</td>
//                 <td>{r.duracion}</td>
//                 <td>{r.asistencia}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// };

// export default AsistenciaDocentes;

import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const dias = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// Función para parsear "14:30 a 15:30"
const parseHorario = (str) => {
  if (!str) return null;
  const [inicio, fin] = str.split(" a ");
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
};

// Función para formato 24 hs
const formatearFechaHora24 = (fechaStr) => {
  const fecha = new Date(fechaStr);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const segundos = String(fecha.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
};

const AsistenciaDocentes = ({ reuniones }) => {
  const [horarios, setHorarios] = useState([]);
  const [resultado, setResultado] = useState([]);

  useEffect(() => {
    fetch("/archivo/horarios.csv")
      .then((res) => res.text())
      .then((text) => {
        const data = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        }).data;
        setHorarios(data);
      });
  }, []);

  useEffect(() => {
    if (horarios.length === 0 || reuniones.length === 0) return;

    const resultados = [];

    reuniones.forEach((r) => {
      const fecha = new Date(r.inicio);
      const diaTexto = dias[fecha.getDay()];
      const horaMinutos = fecha.getHours() * 60 + fecha.getMinutes();

      // Buscar docentes con ese link
      const docentes = horarios.filter((h) => {
        const link = h.lugar_v
          ?.split("/")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        return link && r.link.replace(/-/g, "") === link;
      });

      docentes.forEach((doc) => {
        const horarioEsperado = parseHorario(doc[diaTexto]);
        let asistencia = "No";

        if (
          horarioEsperado &&
          horaMinutos >= horarioEsperado.inicio &&
          horaMinutos <= horarioEsperado.fin
        ) {
          asistencia = "Sí";
        }

        resultados.push({
          legajo: doc.leg,
          codigoMateria: r.codigoMateria,
          dia: diaTexto,
          inicioReal: formatearFechaHora24(r.inicio),
          duracion: r.duracion,
          horaEsperada: doc[diaTexto],
          asistencia,
        });
      });
    });

    setResultado(resultados);
  }, [horarios, reuniones]);

  return (
    <div className="container mt-5">
      <h3>Verificación de Asistencia Docente</h3>

      {resultado.length === 0 ? (
        <p>No hay datos suficientes aún.</p>
      ) : (
        <table className="table table-bordered mt-3">
          <thead className="table-light">
            <tr>
              <th>Legajo</th>
              <th>Código materia</th>
              <th>Día</th>
              <th>Hora esperada</th>
              <th>Inicio real</th>
              <th>Duración</th>
              <th>¿Asistió en horario?</th>
            </tr>
          </thead>
          <tbody>
            {resultado.map((r, i) => (
              <tr key={i}>
                <td>{r.legajo}</td>
                <td>{r.codigoMateria}</td>
                <td>{r.dia}</td>
                <td>{r.horaEsperada || "-"}</td>
                <td>{r.inicioReal}</td>
                <td>{r.duracion}</td>
                <td>{r.asistencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AsistenciaDocentes;
