import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRequestWithReply, replyMessageTeam } from "../../api/requestApi";
import { toast } from "react-toastify";
import { Card, Button } from "@themesberg/react-bootstrap";
import { useHistory } from "react-router-dom";
import moment from "moment-timezone";

export default function Chat() {
  const { id, status_ticket } = useParams();
  const history = useHistory();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState({ message_reply: "", file: null });
  const [replies, setReplies] = useState([]);

  const statusLabelMap = {
    W: { text: "WAITING", className: "text-warning" },
    P: { text: "ON PROGRESS", className: "text-info" },
    D: { text: "DONE", className: "text-success" },
    C: { text: "CLOSED", className: "text-success" },
    E: { text: "ESCALATED", className: "text-info" },
    R: { text: "REJECTED", className: "text-danger" },
  };
  const statusInfo = statusLabelMap[status_ticket] || {
    text: status_ticket || "UNKNOWN",
    className: "text-secondary",
  };
  const isReadOnly = status_ticket === "C" || status_ticket === "R";

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const getData = await getRequestWithReply(id);
        const request = getData.data.data;
        const detail = request.requests_detail || request.detail || {};
        setSubject(detail.subject_request ?? detail.subjek_request ?? "");
        setReplies(Array.isArray(request.replies) ? request.replies : []);
      } catch (error) {
        toast.warning("Something went wrong when fetching request data :(");
        window.history.back();
        console.log(error);
      }
    };

    fetchConversation();
  }, [id]);

  const handleSendMessage = async () => {
    if (!message.message_reply?.trim() && !message.file) {
      toast.warning("Please enter a message or attach a file.");
      return;
    }

    const formData = new FormData();
    formData.append("message_reply", message.message_reply || "");
    if (message.file) {
      formData.append("file", message.file);
    }

    try {
      const send = await replyMessageTeam(id, formData);
      toast.success("Successfully send message!");
      const newReply = send?.data?.data;
      if (newReply) {
        setReplies((prev) => [...prev, newReply]);
      }
      setMessage({ message_reply: "", file: null });
    } catch (error) {
      toast.warning("Something went wrong when send message :(");
      console.log(error);
    }
  };

  const chatData = replies.map((reply, index) => {
    if (!reply) {
      return null;
    }

    return (
      <Card key={`${reply.createdAt}-${index}`} style={{ padding: "20px" }} className="shadow-lg border-0 mt-3">
        <div className="d-flex justify-content-between">
          <span className="text-info">{reply.user_reply} sent a message</span>
          <span>{moment(reply.createdAt).month(1).format("DD-MM-YYYY HH:mm")}</span>
        </div>
        <hr />
        <div>{reply.message}</div>
        {reply.file_document ? (
          <div style={{ width: "140px" }} className="mt-3">
            <a
              href={reply.file_document}
              className="btn btn-info btn-sm"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "13px" }}
            >
              <b>Attached file</b>
            </a>
          </div>
        ) : null}
      </Card>
    );
  });

  return (
    <div
      style={{ height: "86.5vh" }}
      className="mt-3 d-flex flex-column justify-content-between"
    >
      <div className="chat-wrap">
        <Card style={{ padding: "20px" }} className="shadow-lg border-0">
          <div className="d-flex justify-content-between">
            <span className="text-info">Subject request</span>
            <h5>
              <span className={statusInfo.className}>{statusInfo.text}</span>
            </h5>
          </div>
          <hr />
          {subject}

          <div style={{ width: "1000px" }}>
            <Button
              variant="info"
              className="mt-2"
              size="sm"
              style={{ width: "12%" }}
              onClick={() => history.push(`/ticketing/detail-request/${id}`)}
            >
              Detail Request
            </Button>
          </div>
        </Card>
        {chatData}
      </div>

      <Card
        style={{ padding: "20px" }}
        className="shadow-lg border-0 d-flex flex-column mt-5"
      >
        <textarea
          className="form-control"
          rows="5"
          placeholder={isReadOnly ? "This ticket is read-only." : "Reply here..."}
          disabled={isReadOnly}
          value={message.message_reply}
          onChange={(e) =>
            setMessage({ ...message, message_reply: e.target.value })
          }
        />
        <input
          className="form-control mt-2"
          type="file"
          placeholder="Lampiran file"
          onChange={(e) => setMessage({ ...message, file: e.target.files[0] })}
          disabled={isReadOnly}
        />
        <button
          className="btn btn-primary mt-2 2-50"
          disabled={isReadOnly}
          onClick={() => handleSendMessage()}
        >
          Send
        </button>
      </Card>
    </div>
  );
}
