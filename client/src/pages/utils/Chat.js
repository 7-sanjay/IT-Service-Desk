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
  const [message, setMessage] = useState({
    message_reply: "",
    file: "",
  });
  const [replies, setReplies] = useState([]);
  let formData = new FormData();

  useEffect(() => {
    (async () => {
      try {
        const getData = await getRequestWithReply(id);
        const detail = getData.data.data[0].requests_detail || getData.data.data[0].detail || {};
        setSubject(detail.subject_request ?? detail.subjek_request ?? "");
        setReplies(getData.data.data);
      } catch (error) {
        toast.warning("Something went wrong when fetching request data :(");
        window.history.back();
        console.log(error);
      }
    })();
  }, [id]);

  const handleSendMessage = async () => {
    try {
      formData.append("message_reply", message.message_reply);
      formData.append("file", message.file);
      await replyMessageTeam(id, formData);
      toast.success("Successfully send message!");
      // replies.push({
      //   reply_requests: {
      //     user_reply: send.data.data.user_reply,
      //     message: send.data.data.message,
      //   },
      // });
      setMessage("");
      window.location.reload();
    } catch (error) {
      toast.warning("Something went wrong when send message :(");
      console.log(error);
    }
    setMessage("");
  };

  const chatData = replies.map((reply) => {
    if (reply.reply_requests.id === null) {
      return null;
    } else {
      return (
        <Card style={{ padding: "20px" }} className="shadow-lg border-0 mt-3">
          <div className="d-flex justify-content-between">
            <span className="text-info">
              {reply.reply_requests.user_reply} sent a message
            </span>
            <span>
              {moment(reply.reply_requests.createdAt)
                .month(1)
                .format("DD-MM-YYYY HH:mm")}
            </span>
          </div>
          <hr />
          {reply.reply_requests.message}
          {reply.reply_requests.file ? (
            <div style={{ width: "100px" }} className="mt-3">
              <a
                href={reply.reply_requests.file.file_document}
                className="btn btn-info btn-sm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "13px" }}
              >
                <b>File terlampir</b>
              </a>
            </div>
          ) : null}
        </Card>
      );
    }
  });

  return (
    <div
      style={{ height: "86.5vh" }}
      className="mt-3 d-flex flex-column justify-content-between"
    >
      <div className="chat-wrap">
        <Card style={{ padding: "20px" }} className="shadow-lg border-0">
          <div className="d-flex justify-content-between">
            <span className="text-info">subject message request</span>
            <h5>
              {status_ticket === "Waiting" ? (
                <span className="text-warning">WAITING</span>
              ) : null}
              {status_ticket === "ON Progress" ? (
                <span className="text-info">ON PROGRESS</span>
              ) : null}
              {status_ticket === "Done" ? (
                <span className="text-success">DONE</span>
              ) : null}
              {status_ticket === "Rejected" ? (
                <span className="text-danger">REJECTED</span>
              ) : null}
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
          placeholder="Reply here..."
          disabled={status_ticket === "Done" ? true : false}
          onChange={(e) =>
            setMessage({ ...message, message_reply: e.target.value })
          }
        />
        <input
          className="form-control mt-2"
          type="file"
          placeholder="Lampiran file"
          onChange={(e) => setMessage({ ...message, file: e.target.files[0] })}
          disabled={status_ticket === "Done" ? true : false}
        />
        <button
          className="btn btn-primary mt-2 2-50"
          disabled={status_ticket === "Done" ? true : false}
          onClick={() => handleSendMessage()}
        >
          Send
        </button>
      </Card>
    </div>
  );
}
