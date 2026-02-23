import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./render.scss";
import moment from "moment-timezone";
import { getDetailRequest } from "../../api/requestApi";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RenderPdf() {
  const query = useQuery();
  const [request, setRequest] = useState(null);

  const incidentCategories = [
    "Hardware Issue",
    "Software Issue",
    "Network Issue",
    "Email Issue",
    "Access/Login Issue",
    "Server/System Issue",
    "Security Issue",
    "Others",
  ];

  const requestCategories = [
    "Password Reset",
    "Software Installation",
    "New Account Creation",
    "Access Permission Request",
    "New Hardware Request",
    "Email Account Setup",
    "Upgrade Request",
    "General IT Support",
  ];

  // Load request data from MongoDB when an id is provided; otherwise fall back to query params
  useEffect(() => {
    const id = query.get("id");

    const load = async () => {
      if (id) {
        try {
          const res = await getDetailRequest(id);
          setRequest(res.data.data);
        } catch (err) {
          console.error("Failed to load request for PDF:", err);
        }
      } else {
        // Fallback: use query parameters (older behavior)
        setRequest({
          user_request: query.get("user") || "",
          department: query.get("department") || "",
          type: query.get("type") || "",
          category: query.get("category") || "",
          requests_detail: {
            title_request: query.get("title") || "",
            subject_request: query.get("subject") || "",
          },
          createdAt: new Date().toISOString(),
        });
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger print once data is ready
  useEffect(() => {
    if (request) {
      document.title = `Request-${moment().format("DD-MM-YYYY HH:mm:ss")}`;
      window.print();
    }
  }, [request]);

  if (!request) {
    return null;
  }

  const userRequest = request.user_request || "";
  const department = request.department || "";
  const category = request.category || "";

  let typeCode = request.type || query.get("type") || "";

  // Infer type when not explicitly stored
  if (!typeCode && category) {
    if (
      incidentCategories.some(
        (c) => c.toLowerCase() === category.toLowerCase()
      )
    ) {
      typeCode = "I";
    } else if (
      requestCategories.some(
        (c) => c.toLowerCase() === category.toLowerCase()
      )
    ) {
      typeCode = "P";
    }
  }

  const typeLabel =
    typeCode === "I" ? "Incident" : typeCode === "P" ? "Request" : "";

  const lowerCategory = category.toLowerCase();

  const titleRequest =
    (request.requests_detail &&
      request.requests_detail.title_request) ||
    (request.detail && request.detail.title_request) ||
    "";

  const subjectRequest =
    (request.requests_detail && request.requests_detail.subject_request) ??
    (request.detail && request.detail.subject_request) ??
    (request.requests_detail && request.requests_detail.subjek_request) ??
    (request.detail && request.detail.subjek_request) ??
    "";

  const createdAt = request.createdAt
    ? moment(request.createdAt).month(1).format("DD-MM-YYYY HH:mm")
    : moment().format("DD-MM-YYYY HH:mm");

  const categoryList =
    typeLabel === "Incident"
      ? incidentCategories
      : typeLabel === "Request"
      ? requestCategories
      : [];

  return (
    <>
      <div className="header-1">
        <h3>
          Form <br /> IT Service Request
        </h3>
      </div>

      <div className="wrap">
        <table border="1" cellPadding={0} cellSpacing className="table-pdf">
          <tbody>
            <tr className="tr-form-1">
              <td className="td-pdf" align="justify">
                Name : <b>{userRequest}</b>
              </td>
              <td className="td-pdf" align="justify">
                Date : <b>{moment().format("DD-MM-YYYY HH:mm")}</b>
              </td>
            </tr>
            <tr className="tr-form-1">
              <td className="td-pdf" align="justify">
                Department : <b>{department}</b>
              </td>
              <td className="td-pdf" align="justify">
                Type : <b>{typeLabel}</b>
                <br />
                Category : <b>{category}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="header-2">
        <h6>
          <b>Category List</b>
        </h6>
      </div>

      <div className="wrap">
        <table border="1" cellPadding={0} cellSpacing className="table-pdf">
          <tbody>
            {categoryList.length > 0 && (
              <>
                {categoryList.reduce((rows, item, index) => {
                  if (index % 2 === 0) {
                    rows.push([item]);
                  } else {
                    rows[rows.length - 1].push(item);
                  }
                  return rows;
                }, []).map((row, rowIndex) => (
                  <tr className="tr-form-1" key={rowIndex}>
                    <td className="td-pdf" align="justify">
                      {row[0] &&
                      lowerCategory === row[0].toLowerCase() ? (
                        <span>&#128505;</span>
                      ) : (
                        <span>&#9634;</span>
                      )}{" "}
                      {row[0]}
                    </td>
                    <td className="td-pdf" align="justify">
                      {row[1] ? (
                        <>
                          {lowerCategory === row[1].toLowerCase() ? (
                            <span>&#128505;</span>
                          ) : (
                            <span>&#9634;</span>
                          )}{" "}
                          {row[1]}
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </>
            )}
            <tr className="tr-form-1">
              <td className="td-pdf" align="center" colSpan={2}>
                Request Details
              </td>
            </tr>
            <tr className="tr-form-1">
              <td className="td-pdf detail" align="justify" colSpan={2}>
                <p>{createdAt}</p>

                <h5>{titleRequest}</h5>

                <p>{subjectRequest}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </>
  );
}
