const transporter = require("../../utils/nodemailer");
const { getDb } = require("../../config/mongo");
const { ObjectId } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const isSupportEngineer = (level) =>
  level === "support_engineer" || level === "team";
const isManager = (level) => level === "manager" || level === "head";

// Department filter for team/head: only tickets from their assigned department. Ticket "Human Resources (HR)" matches user department "HR".
const getDepartmentFilter = (decoded) => {
  if (!isSupportEngineer(decoded.level) && !isManager(decoded.level)) return {};
  const d = decoded.department;
  if (!d) return {};
  if (d === "HR") {
    return { department: { $in: ["HR", "Human Resources (HR)"] } };
  }
  return { department: d };
};

const requestInUserDepartment = (request, decoded) => {
  if (!isSupportEngineer(decoded.level) && !isManager(decoded.level)) return true;
  const d = decoded.department;
  if (!d) return true;
  const reqDept = request.department;
  if (d === "HR") return reqDept === "HR" || reqDept === "Human Resources (HR)";
  return reqDept === d;
};

const canAccessRequestConversation = (request, decoded) => {
  if (decoded.level === "admin") return true;
  if (decoded.level === "user") {
    return String(request.id_user) === String(decoded.id);
  }
  return requestInUserDepartment(request, decoded);
};

// pagination function
const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? +(page - 1) * limit : 0;
  return { limit, offset };
};

const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: requests } = data;
  const currentPage = page ? +parseInt(page) : 1;
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, requests, totalPages, currentPage };
};

const normalizePriority = (priority, fallback = "Medium") => {
  if (priority === null || priority === undefined) return fallback;
  const raw = String(priority).trim().toLowerCase();

  if (raw === "low") return "Low";
  if (raw === "medium") return "Medium";
  if (raw === "high") return "High";

  // Legacy compatibility: old "Critical" tickets now map to "High"
  if (raw === "critical") return "High";

  return fallback;
};

const normalizeRequestPriority = (request) => ({
  ...request,
  priority: normalizePriority(request.priority),
});

const getSlaForPriority = async (db, priority) => {
  const slaCollection = db.collection("SLA");
  const normalized = normalizePriority(priority);
  return slaCollection.findOne({ priority: normalized });
};

// Determine ticket priority (Low/Medium/High)
const determinePriority = (category = "", title = "", subject = "") => {
  const text = `${category} ${title} ${subject}`.toLowerCase();

  const hasAny = (terms) => terms.some((t) => text.includes(t));

  // High: major outage, security, data loss, production down
  if (
    hasAny([
      "system down",
      "server down",
      "network down",
      "email down",
      "outage",
      "cannot access",
      "can't access",
      "unable to access",
      "unable to login",
      "unable to log in",
      "all users",
      "entire company",
      "production down",
      "critical",
      "sev1",
      "p1",
      "security breach",
      "data loss",
      "ransomware",
      "virus",
      "malware",
      "unauthorized access",
    ])
  ) {
    return "High";
  }

  // High: blocking work for multiple users or explicitly urgent
  if (
    hasAny([
      "urgent",
      "asap",
      "high priority",
      "major issue",
      "multiple users",
      "department wide",
      "team wide",
      "cannot",
      "can't",
      "unable",
      "failed",
      "error",
      "not able to",
    ])
  ) {
    return "High";
  }

  // Medium: functional issues impacting a single user or non-urgent degradation
  if (
    hasAny([
      "issue",
      "problem",
      "not working",
      "intermittent",
      "slow",
      "degraded",
    ])
  ) {
    return "Medium";
  }

  // Low: requests, questions, non-urgent changes
  if (
    hasAny([
      "request",
      "access request",
      "new account",
      "installation",
      "install",
      "how to",
      "question",
      "inquiry",
      "change request",
      "information",
    ])
  ) {
    return "Low";
  }

  // Fallback based on category when text is ambiguous
  const cat = (category || "").toLowerCase();
  if (["network", "server", "security", "email"].some((c) => cat.includes(c))) {
    return "High";
  }
  if (["request", "access", "hardware", "software"].some((c) => cat.includes(c))) {
    return "Medium";
  }

  // Default
  return "Medium";
};

const createRequest = async (req, res) => {
  const url = req.protocol + "://" + req.get("host");
  const {
    userRequest,
    department,
    category,
    type,
    email,
    titleRequest,
  } = req.body;
  // Prefer correct spelling; accept old spelling for backward compatibility
  const subjectRequest = req.body.subjectRequest ?? req.body.subjekRequest ?? "";

  const priority = determinePriority(category, titleRequest, subjectRequest);

  let insertedId = null;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    let imageFile = null;
    let fileDocument = null;

    if (req.files && Object.keys(req.files).length > 0) {
      if (req.files.image && req.files.image.length > 0) {
        imageFile = url + "/public/files/" + req.files.image[0].filename;
      }
      if (req.files.file_document && req.files.file_document.length > 0) {
        fileDocument =
          url + "/public/files/" + req.files.file_document[0].filename;
      }
    }

    const now = new Date();
    const slaRule = await getSlaForPriority(db, priority);
    const responseDueAt = slaRule
      ? new Date(now.getTime() + slaRule.responseTime * 60 * 1000)
      : null;
    const resolutionDueAt = slaRule
      ? new Date(now.getTime() + slaRule.resolutionTime * 60 * 1000)
      : null;
    const insertResult = await requestsCollection.insertOne({
      id_user: req.decoded.id,
      user_request: req.decoded.username,
      category,
      type,
      email_request: req.decoded.email,
      department,
      ticket_status: "W",
      priority: normalizePriority(priority), // Low / Medium / High
      priority_locked_at: now,
      start_process_ticket: now, // Timer starts when ticket is created
      end_date_ticket: null,
      accumulated_time_ms: 0, // Track accumulated time when ticket is paused/resumed
      responseDueAt,
      resolutionDueAt,
      respondedAt: null,
      resolvedAt: null,
      responseSLA: null,
      resolutionSLA: null,
      escalated: false,
      createdAt: now,
      updatedAt: now,
      // Keep original field names expected by frontend
      requests_detail: {
        title_request: titleRequest,
        subject_request: subjectRequest,
      },
      file:
        imageFile || fileDocument
          ? {
              image: imageFile,
              file_document: fileDocument,
            }
          : null,
      // Also keep new fields for backward compatibility with any existing data
      detail: {
        title_request: titleRequest,
        subject_request: subjectRequest,
      },
      files:
        imageFile || fileDocument
          ? {
              image: imageFile,
              file_document: fileDocument,
            }
          : null,
      replies: [],
    });
  } catch (mongoErr) {
    console.error("Failed to save request to MongoDB:", mongoErr.message);
  }

  let mailOptions = {
    from: userRequest,
    to: process.env.MAIL_DESTINATION,
    subject: `New ticket received from ${userRequest}`,
    html: `
    <h3>Dear IT team,</h3>
    <p>
      The IT Service Desk has received a new request from <b>${userRequest}</b>.
      Please sign in to the Ticketing System to review and process this ticket.
      Thank you.
    </p>
    `,
  };

  await transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Email sent!");
    }
  });

  res.status(200).json({
    status: "success",
    message: "Successfully create request!",
    data: insertedId
      ? {
          id: insertedId.toString(),
        }
      : null,
  });
};

// ADMIN
const getRequests = async (req, res) => {
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const totalItems = await requestsCollection.countDocuments({});
    const requests = await requestsCollection
      .find({})
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    const normalizedRequests = requests.map(normalizeRequestPriority);

    const response = {
      totalItems,
      requests: normalizedRequests,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page ? +parseInt(page) : 1,
    };

    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (err) {
    console.error("Mongo getRequests error:", err.message);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// HEAD
const getRequestsHead = async (req, res) => {
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);

    const totalItems = await requestsCollection.countDocuments(deptFilter);
    const requests = await requestsCollection
      .find(deptFilter)
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    const normalizedRequests = requests.map(normalizeRequestPriority);

    const response = {
      totalItems,
      requests: normalizedRequests,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page ? +parseInt(page) : 1,
    };

    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (err) {
    console.error("Mongo getRequestsHead error:", err.message);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getAllUserRequest = async (req, res) => {
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const totalItems = await requestsCollection.countDocuments({
      id_user: req.decoded.id,
    });
    const requests = await requestsCollection
      .find({ id_user: req.decoded.id })
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    const normalizedRequests = requests.map(normalizeRequestPriority);

    const response = {
      totalItems,
      requests: normalizedRequests,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page ? +parseInt(page) : 1,
    };

    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (err) {
    console.error("Mongo getAllUserRequest error:", err.message);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getUserRequestWaiting = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);
    let filter = { ...deptFilter, ticket_status: "W" };

    if (req.decoded.level !== "admin" && !isSupportEngineer(req.decoded.level)) {
      filter = { id_user: req.decoded.id, ticket_status: "W" };
    } else if (isSupportEngineer(req.decoded.level) || isManager(req.decoded.level)) {
      filter = { ...deptFilter, ticket_status: "W" };
    }

    const requests = await requestsCollection
      .find(filter)
      .project({ _id: 1 })
      .toArray();

    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data: requests,
    });
  } catch (err) {
    console.error("Mongo getUserRequestWaiting error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getUserRequestProcess = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);
    let filter = { ...deptFilter, ticket_status: "P" };

    if (isSupportEngineer(req.decoded.level)) {
      filter = { ...deptFilter, user_process: req.decoded.fullname, ticket_status: "P" };
    } else if (isManager(req.decoded.level)) {
      filter = { ...deptFilter, ticket_status: "P" };
    } else if (req.decoded.level !== "admin") {
      filter = { id_user: req.decoded.id, ticket_status: "P" };
    }

    const requests = await requestsCollection
      .find(filter)
      .project({ _id: 1 })
      .toArray();

    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data: requests,
    });
  } catch (err) {
    console.error("Mongo getUserRequestProcess error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getUserRequestDone = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);
    let filter = { ...deptFilter, ticket_status: "D" };

    if (isSupportEngineer(req.decoded.level)) {
      filter = { ...deptFilter, user_process: req.decoded.fullname, ticket_status: "D" };
    } else if (isManager(req.decoded.level)) {
      filter = { ...deptFilter, ticket_status: "D" };
    } else if (req.decoded.level !== "admin") {
      filter = { id_user: req.decoded.id, ticket_status: "D" };
    }

    const requests = await requestsCollection
      .find(filter)
      .project({ _id: 1 })
      .toArray();

    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data: requests,
    });
  } catch (err) {
    console.error("Mongo getUserRequestDone error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// get all requests by user process = team
const getAllUserProcess = async (req, res) => {
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);

    const totalItems = await requestsCollection.countDocuments(deptFilter);
    const requests = await requestsCollection
      .find(deptFilter)
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
    const normalizedRequests = requests.map(normalizeRequestPriority);

    const response = {
      totalItems,
      requests: normalizedRequests,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page ? +parseInt(page) : 1,
    };

    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (err) {
    console.error("Mongo getAllUserProcess error:", err.message);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// search requests data
const searchData = async (req, res) => {
  const { search } = req.query;
  let requests;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const deptFilter = getDepartmentFilter(req.decoded);
    const baseFilter =
      req.decoded.level === "admin"
        ? {}
        : isSupportEngineer(req.decoded.level) || isManager(req.decoded.level)
        ? deptFilter
        : { id_user: req.decoded.id };

    const requestsCursor = requestsCollection.find({
      ...baseFilter,
      $or: [
        { user_request: { $regex: search, $options: "i" } },
        { user_process: { $regex: search, $options: "i" } },
        { "requests_detail.title_request": { $regex: search, $options: "i" } },
        { "detail.title_request": { $regex: search, $options: "i" } },
        { "requests_detail.subject_request": { $regex: search, $options: "i" } },
        { "detail.subject_request": { $regex: search, $options: "i" } },
        // Backward compatibility: old spelling (subjek)
        { "requests_detail.subjek_request": { $regex: search, $options: "i" } },
        { "detail.subjek_request": { $regex: search, $options: "i" } },
      ],
    });

    const results = (await requestsCursor.toArray()).map(normalizeRequestPriority);

    if (!results) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data: results,
    });
  } catch (err) {
    console.error("Mongo searchData error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getDetailRequestById = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      console.error("getDetailRequestById: invalid ObjectId", id);
      return res.status(400).json({
        status: "failed",
        message: "Invalid request id",
      });
    }

    const request = await requestsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!request) {
      return res.status(404).json({
        status: "failed",
        message: "Request not found",
      });
    }

    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only view tickets from your department.",
      });
    }

    const data = {
      ...normalizeRequestPriority(request),
      id: request._id.toString(),
    };
    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data,
    });
  } catch (err) {
    console.error("Mongo getDetailRequestById error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getRequestWithRequestReply = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!request) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    if (!canAccessRequestConversation(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You are not allowed to view this ticket conversation.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully get requests!",
      data: normalizeRequestPriority(request),
    });
  } catch (err) {
    console.error("Mongo getRequestWithRequestReply error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const updateUserProcessOnRequest = async (req, res) => {
  const { user_process } = req.body;
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }
    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only assign tickets from your department.",
      });
    }

    const updateUserProcess = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { user_process: user_process, updatedAt: new Date() } }
    );

    if (!updateUserProcess) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully update user process!",
    });
  } catch (err) {
    console.error("Mongo updateUserProcessOnRequest error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const approveRequestAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ticket_status: "P", updatedAt: new Date() } }
    );

    if (!updateStatus) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully update status!",
    });
  } catch (err) {
    console.error("Mongo approveRequestAdmin error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const rejectRequestAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const updateUserProcess = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ticket_status: "R", updatedAt: new Date() } }
    );

    if (!updateUserProcess) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully reject request!",
    });
  } catch (err) {
    console.error("Mongo rejectRequestAdmin error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const approveRequestTeam = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }
    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only approve tickets from your department.",
      });
    }

    const now = new Date();
    const updateData = {
      ticket_status: "P",
      user_process: req.decoded.fullname,
      updatedAt: now,
    };

    if (!request.respondedAt) {
      updateData.respondedAt = now;
      if (request.responseDueAt) {
        updateData.responseSLA =
          now.getTime() <= new Date(request.responseDueAt).getTime()
            ? "Met"
            : "Breached";
      } else {
        updateData.responseSLA = "Met";
      }
    }

    // Ensure start_process_ticket is set (use createdAt if not set, for backward compatibility)
    if (!request.start_process_ticket) {
      updateData.start_process_ticket = request.createdAt || now;
    }
    // Ensure accumulated_time_ms exists
    if (request.accumulated_time_ms === undefined || request.accumulated_time_ms === null) {
      updateData.accumulated_time_ms = 0;
    }

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updateStatus) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully update status!",
    });
  } catch (err) {
    console.error("Mongo approveRequestTeam error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const rejectRequestTeam = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }
    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only reject tickets from your department.",
      });
    }

    const updateUserProcess = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ticket_status: "R", updatedAt: new Date() } }
    );

    if (!updateUserProcess) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully reject request!",
    });
  } catch (err) {
    console.error("Mongo rejectRequestTeam error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const reply_request = async (req, res) => {
  const { id } = req.params;
  const { message_reply } = req.body;
  const url = req.protocol + "://" + req.get("host");

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }
    if (!canAccessRequestConversation(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You are not allowed to reply in this ticket conversation.",
      });
    }

    const replyDoc = {
      message: message_reply,
      user_reply: req.decoded.fullname || req.decoded.username,
      createdAt: new Date(),
      file_document: req.file
        ? url + "/public/files/" + req.file.filename
        : null,
    };

    const updateResult = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          replies: replyDoc,
        },
      }
    );

    const findRequest = await requestsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { user_request: 1, email_request: 1 } }
    );

    if (
      findRequest &&
      isSupportEngineer(req.decoded.level) &&
      findRequest.email_request
    ) {
      let mailOptions = {
        from: req.decoded.email,
        to: findRequest.email_request,
        subject: `Reply for request ${id} from ${req.decoded.fullname}`,
        html: `
        <h3>Dear ${findRequest.user_request},</h3>
        <p>
          You have received a reply on ticket <b>${id}</b> from
          <b>${req.decoded.fullname}</b>. Please log in to the application to
          review and respond to this ticket.
        </p>
        `,
      };

      await transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Reply notification email sent!");
        }
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully replied to request!",
      data: replyDoc,
    });
  } catch (mongoErr) {
    console.error("Failed to save reply to MongoDB:", mongoErr.message);
    return res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const requestDone = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }
    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only complete tickets from your department.",
      });
    }

    const now = new Date();
    const updateData = {
      ticket_status: "D",
      end_date_ticket: now, // Set end date when team marks as Done
      updatedAt: now,
      resolvedAt: now,
    };

    // Calculate accumulated time if ticket was previously in progress
    if (request.start_process_ticket && request.ticket_status === "P") {
      const elapsedMs = now.getTime() - new Date(request.start_process_ticket).getTime();
      const currentAccumulated = request.accumulated_time_ms || 0;
      updateData.accumulated_time_ms = currentAccumulated + elapsedMs;
      // Reset start_process_ticket to null since timer is paused
      updateData.start_process_ticket = null;
    }

    if (request.resolutionDueAt) {
      const breached = now.getTime() > new Date(request.resolutionDueAt).getTime();
      updateData.resolutionSLA = breached ? "Breached" : "Met";
      if (breached) {
        updateData.escalated = true;
      }
    } else {
      updateData.resolutionSLA = "Met";
    }

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updateStatus) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully update status!",
    });
  } catch (err) {
    console.error("Mongo requestDone error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// User (role) confirms ticket is resolved and closes it (changes status from "D" Done to "C" Closed)
const userResolveRequest = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid request id" });
  }

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }

    if (String(request.id_user) !== String(req.decoded.id)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only resolve your own tickets.",
      });
    }

    if (request.ticket_status === "C") {
      return res.status(400).json({
        status: "failed",
        message: "This ticket is already closed.",
      });
    }

    if (request.ticket_status === "R") {
      return res.status(400).json({
        status: "failed",
        message: "Rejected tickets cannot be resolved.",
      });
    }

    const viaAi = !!(req.body && req.body.viaAi);

    // Only non-AI closes require ticket to be in "Done" status; AI troubleshoot can be closed anytime by user
    if (!viaAi && request.ticket_status !== "D") {
      return res.status(400).json({
        status: "failed",
        message: "Only tickets marked as 'Done' by the team can be closed.",
      });
    }

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ticket_status: "C",
          updatedAt: new Date(),
          closed_by_ai: viaAi,
        },
      }
    );

    if (!updateStatus || updateStatus.matchedCount === 0) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Ticket closed successfully.",
    });
  } catch (err) {
    console.error("userResolveRequest error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// User (role) reopens ticket when issue is not solved (changes status from "D" Done back to "P" Progress)
const reopenTicket = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid request id" });
  }

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }

    if (String(request.id_user) !== String(req.decoded.id)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only reopen your own tickets.",
      });
    }

    // Only allow reopening tickets that are in "Done" status
    if (request.ticket_status !== "D") {
      return res.status(400).json({
        status: "failed",
        message: "Only tickets marked as 'Done' can be reopened.",
      });
    }

    const now = new Date();
    const updateData = {
      ticket_status: "P",
      start_process_ticket: now, // Resume timer from now
      end_date_ticket: null, // Clear end date
      updatedAt: now,
    };

    // Keep accumulated_time_ms as is (time already accumulated from previous processing)

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updateStatus || updateStatus.matchedCount === 0) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Ticket reopened successfully.",
    });
  } catch (err) {
    console.error("reopenTicket error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// Team (role) escalates ticket to head when they cannot solve the problem
const escalateRequest = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid request id" });
  }

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }

    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only escalate tickets from your department.",
      });
    }

    // Only allow escalating tickets that are in progress
    if (request.ticket_status !== "P") {
      return res.status(400).json({
        status: "failed",
        message: "Only tickets in progress can be escalated.",
      });
    }

    const now = new Date();
    const updateData = {
      ticket_status: "E",
      updatedAt: now,
      escalated: true,
    };

    // Pause timer when escalating - accumulate time and reset start_process_ticket
    if (request.start_process_ticket) {
      const elapsedMs = now.getTime() - new Date(request.start_process_ticket).getTime();
      const currentAccumulated = request.accumulated_time_ms || 0;
      updateData.accumulated_time_ms = currentAccumulated + elapsedMs;
      updateData.start_process_ticket = null; // Pause timer
    }

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updateStatus || updateStatus.matchedCount === 0) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Ticket escalated to head successfully.",
    });
  } catch (err) {
    console.error("escalateRequest error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// Head (role) reassigns escalated ticket to another team member
const reassignRequest = async (req, res) => {
  const { id } = req.params;
  const { user_process } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: "failed", message: "Invalid request id" });
  }

  if (!user_process || !user_process.trim()) {
    return res.status(400).json({
      status: "failed",
      message: "Team member name is required.",
    });
  }

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
    if (!request) {
      return res.status(404).json({ status: "failed", message: "Request not found" });
    }

    if (!requestInUserDepartment(request, req.decoded)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only reassign tickets from your department.",
      });
    }

    // Only allow reassigning escalated tickets
    if (request.ticket_status !== "E") {
      return res.status(400).json({
        status: "failed",
        message: "Only escalated tickets can be reassigned.",
      });
    }

    const now = new Date();
    const updateData = {
      ticket_status: "P",
      user_process: user_process,
      updatedAt: now,
    };

    // Resume timer - set start_process_ticket if not already set
    // Keep accumulated_time_ms as is (time already accumulated)
    if (!request.start_process_ticket) {
      updateData.start_process_ticket = now;
    }
    // Ensure accumulated_time_ms exists
    if (request.accumulated_time_ms === undefined || request.accumulated_time_ms === null) {
      updateData.accumulated_time_ms = 0;
    }

    const updateStatus = await requestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!updateStatus || updateStatus.matchedCount === 0) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Ticket reassigned successfully.",
    });
  } catch (err) {
    console.error("reassignRequest error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const filterDataByDate = async (req, res) => {
  const { startDate, endDate } = req.body;

  const startedDate = new Date(startDate);
  const endedDate = new Date(endDate);

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const deptFilter = getDepartmentFilter(req.decoded);

    const requests = await requestsCollection
      .find({
        ...deptFilter,
        createdAt: {
          $gte: startedDate,
          $lte: endedDate,
        },
      })
      .toArray();

    if (!requests) {
      return res.status(500).json({
        status: "failed",
        message: "Something went wrong!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully filter data!",
      data: requests,
    });
  } catch (err) {
    console.error("Mongo filterDataByDate error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// AI Help: get troubleshooting steps from Gemini based on request description (user role)
const getRequestAiHelp = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid request id",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      status: "failed",
      message: "AI Help is not configured. Please set GEMINI_API_KEY in server environment.",
    });
  }

  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const request = await requestsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!request) {
      return res.status(404).json({
        status: "failed",
        message: "Request not found",
      });
    }

    // For user role, ensure the request belongs to the current user
    if (req.decoded.level === "user" && String(request.id_user) !== String(req.decoded.id)) {
      return res.status(403).json({
        status: "failed",
        message: "You can only get AI help for your own requests.",
      });
    }

    const detail = request.requests_detail || request.detail || {};
    const description =
      detail.subject_request ?? detail.subjek_request ?? "";

    if (!description || !description.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "This request has no description to analyze.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Prefer free-tier models (no billing). Order: flash-lite (best free quota) → 2.5-flash → 2.0-flash. Override with GEMINI_MODEL to force one model.
    const freeTierModels = [
      "gemini-2.5-flash-lite",  // Free: 15 RPM, 1000 RPD
      "gemini-2.5-flash",       // Free: 10 RPM, 250 RPD
      "gemini-2.0-flash",
    ];
    const modelIds = process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : freeTierModels;
    const prompt = `Analyse the IT service desk ticket, identify the issue category, and generate concise, prioritized troubleshooting steps starting with the most probable cause; limit to 6 to 8 numbered steps, no bold text and no extra explanation.

Description: ${description}`;

    const isQuotaOrRateLimit = (e) =>
      e.message && (
        e.message.includes("429") ||
        e.message.includes("Too Many Requests") ||
        e.message.includes("quota") ||
        e.message.includes("rate limit")
      );
    const isModelNotFound = (e) =>
      e.message && (e.message.includes("404") || e.message.includes("not found"));

    let lastError = null;
    const retryDelayMs = 40000;

    for (const modelId of modelIds) {
      const model = genAI.getGenerativeModel({ model: modelId });
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = result.response;
          const text = response.text();
          return res.status(200).json({
            status: "success",
            message: "Successfully generated troubleshooting steps.",
            data: { troubleshooting: text },
          });
        } catch (e) {
          lastError = e;
          if (attempt < 2 && isQuotaOrRateLimit(e)) {
            console.warn(`getRequestAiHelp [${modelId}] attempt ${attempt} rate-limited, retrying in ${retryDelayMs / 1000}s...`);
            await new Promise((r) => setTimeout(r, retryDelayMs));
          } else if (isModelNotFound(e) && modelIds.indexOf(modelId) < modelIds.length - 1) {
            console.warn(`getRequestAiHelp [${modelId}] not available, trying next model...`);
            break;
          } else {
            throw e;
          }
        }
      }
    }
    throw lastError;
  } catch (err) {
    console.error("getRequestAiHelp error:", err.message);
    if (err.message && err.message.includes("API key")) {
      return res.status(401).json({
        status: "failed",
        message: "Invalid or missing Gemini API key.",
      });
    }
    if (err.message && (err.message.includes("429") || err.message.includes("Too Many Requests") || err.message.includes("quota"))) {
      return res.status(429).json({
        status: "failed",
        message: "Gemini API rate limit or quota exceeded. Please try again in a minute, or check your plan and billing at https://ai.google.dev/gemini-api/docs/rate-limits",
      });
    }
    res.status(500).json({
      status: "failed",
      message: err.message || "Something went wrong while generating AI help.",
    });
  }
};

// User dashboard stats (per logged-in user)
const getUserDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    const userFilter = { id_user: req.decoded.id };
    const requests = await requestsCollection
      .find(userFilter)
      .project({ ticket_status: 1, user_process: 1 })
      .toArray();

    const totalTickets = requests.length;
    let openTickets = 0;
    let closedTickets = 0;
    let pendingApproval = 0;

    let requested = 0;
    let assigned = 0;
    let inProgress = 0;
    let resolved = 0;

    requests.forEach((r) => {
      const status = r.ticket_status;

      if (status === "C") {
        closedTickets += 1;
      } else if (status === "W") {
        pendingApproval += 1;
      }

      // Open tickets: everything except Closed and Rejected
      if (status !== "C" && status !== "R") {
        openTickets += 1;
      }

      // Timeline stages
      if (status === "W") {
        requested += 1;
      }
      if (r.user_process) {
        assigned += 1;
      }
      if (status === "P") {
        inProgress += 1;
      }
      if (status === "D" || status === "C") {
        resolved += 1;
      }
    });

    res.status(200).json({
      status: "success",
      message: "User dashboard stats loaded.",
      data: {
        totalTickets,
        openTickets,
        closedTickets,
        pendingApproval,
        timeline: {
          requested,
          assigned,
          inProgress,
          resolved,
        },
      },
    });
  } catch (err) {
    console.error("getUserDashboardStats error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong while loading user dashboard stats.",
    });
  }
};

// Helper to compute average resolution time (in minutes) for a given match filter
const computeAvgResolutionMinutes = async (requestsCollection, matchFilter) => {
  const pipeline = [
    { $match: { ticket_status: "C", ...matchFilter } },
    {
      $group: {
        _id: null,
        totalMs: { $sum: { $ifNull: ["$accumulated_time_ms", 0] } },
        count: { $sum: 1 },
      },
    },
  ];

  const result = await requestsCollection.aggregate(pipeline).toArray();
  if (!result.length || result[0].count === 0) return 0;
  const avgMs = result[0].totalMs / result[0].count;
  return Math.round(avgMs / (1000 * 60)); // minutes
};

// Team dashboard stats (for logged-in team member)
const getTeamDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const fullname = req.decoded.fullname;

    if (!fullname) {
      return res.status(400).json({
        status: "failed",
        message: "Missing fullname in token.",
      });
    }

    const baseFilter = { user_process: fullname };

    const [ticketsAssigned, highPriorityTickets, ticketsClosed, avgResolutionMinutes] =
      await Promise.all([
        requestsCollection.countDocuments({
          ...baseFilter,
          ticket_status: { $nin: ["C", "R"] },
        }),
        requestsCollection.countDocuments({
          ...baseFilter,
          priority: { $in: ["High", "high", "Critical", "critical"] },
          ticket_status: { $nin: ["C", "R"] },
        }),
        requestsCollection.countDocuments({
          ...baseFilter,
          ticket_status: "C",
        }),
        computeAvgResolutionMinutes(requestsCollection, baseFilter),
      ]);

    res.status(200).json({
      status: "success",
      message: "Team dashboard stats loaded.",
      data: {
        ticketsAssigned,
        highPriorityTickets,
        ticketsClosed,
        avgResolutionMinutes,
      },
    });
  } catch (err) {
    console.error("getTeamDashboardStats error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong while loading team dashboard stats.",
    });
  }
};

// Head dashboard stats (per department)
const getHeadDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const usersCollection = db.collection("users");

    const deptFilter = getDepartmentFilter(req.decoded);

    // Base filters
    const totalDeptTickets = await requestsCollection.countDocuments(deptFilter);
    const openTickets = await requestsCollection.countDocuments({
      ...deptFilter,
      ticket_status: { $nin: ["C", "R"] },
    });
    const closedTickets = await requestsCollection.countDocuments({
      ...deptFilter,
      ticket_status: "C",
    });
    const pendingApproval = await requestsCollection.countDocuments({
      ...deptFilter,
      ticket_status: "W",
    });
    const ticketsResolved = closedTickets;
    const ticketsAssigned = await requestsCollection.countDocuments({
      ...deptFilter,
      user_process: { $ne: null },
    });
    const escalatedTickets = await requestsCollection.countDocuments({
      ...deptFilter,
      ticket_status: "E",
    });

    const avgResolutionMinutes = await computeAvgResolutionMinutes(
      requestsCollection,
      deptFilter
    );

    // In Work vs Free for team members in this department
    const teams = await usersCollection
      .find({
        level: { $in: ["support_engineer", "team"] },
        department: req.decoded.department,
      })
      .project({ full_name: 1, fullname: 1 })
      .toArray();
    const teamNames = teams.map((t) => t.full_name || t.fullname).filter(Boolean);

    let inWork = 0;
    let free = 0;
    if (teamNames.length > 0) {
      const activeTickets = await requestsCollection
        .find({
          ...deptFilter,
          ticket_status: "P",
          user_process: { $in: teamNames },
        })
        .project({ user_process: 1 })
        .toArray();
      const inWorkSet = new Set(activeTickets.map((t) => t.user_process));
      inWork = inWorkSet.size;
      free = teamNames.length - inWork;
    }

    res.status(200).json({
      status: "success",
      message: "Head dashboard stats loaded.",
      data: {
        totalDeptTickets,
        openTickets,
        closedTickets,
        avgResolutionMinutes,
        pendingApproval,
        ticketsAssigned,
        ticketsResolved,
        escalatedTickets,
        inWork,
        free,
      },
    });
  } catch (err) {
    console.error("getHeadDashboardStats error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong while loading head dashboard stats.",
    });
  }
};

// Admin dashboard stats (global analytics)
const getAdminDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");
    const usersCollection = db.collection("users");

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      closedTickets,
      deptAgg,
      priorityAgg,
      aiResolvedTickets,
      totalClosedForAi,
      totalUsers,
      totalTeams,
      totalHeads,
    ] = await Promise.all([
      requestsCollection.countDocuments({}),
      requestsCollection.countDocuments({
        ticket_status: { $nin: ["C", "R"] },
      }),
      requestsCollection.countDocuments({ ticket_status: "P" }),
      requestsCollection.countDocuments({ ticket_status: "C" }),
      // Department distribution
      requestsCollection
        .aggregate([
          {
            $group: {
              _id: { $ifNull: ["$department", "Unknown"] },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      // Priority breakdown
      requestsCollection
        .aggregate([
          {
            $group: {
              _id: { $ifNull: ["$priority", "Medium"] },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      // AI metrics
      requestsCollection.countDocuments({
        ticket_status: "C",
        closed_by_ai: true,
      }),
      requestsCollection.countDocuments({ ticket_status: "C" }),
      // User stats
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({
        level: { $in: ["support_engineer", "team"] },
      }),
      usersCollection.countDocuments({ level: { $in: ["manager", "head"] } }),
    ]);

    const departmentDistribution = deptAgg.map((d) => ({
      department: d._id,
      count: d.count,
    }));

    const priorityBuckets = {};
    priorityAgg.forEach((p) => {
      const normalized = normalizePriority(p._id);
      priorityBuckets[normalized] = (priorityBuckets[normalized] || 0) + p.count;
    });
    const priorityBreakdown = Object.keys(priorityBuckets).map((priority) => ({
      priority,
      count: priorityBuckets[priority],
    }));

    const aiSuccessRate =
      totalClosedForAi > 0 ? Math.round((aiResolvedTickets / totalClosedForAi) * 100) : 0;

    // For now, treat all users as active
    const activeUsers = totalUsers;

    res.status(200).json({
      status: "success",
      message: "Admin dashboard stats loaded.",
      data: {
        ticketAnalytics: {
          totalTickets,
          openTickets,
          inProgressTickets,
          closedTickets,
        },
        departmentDistribution,
        priorityBreakdown,
        aiMetrics: {
          aiResolvedTickets,
          aiSuccessRate,
        },
        userStats: {
          totalUsers,
          activeUsers,
          totalTechnicians: totalTeams,
          departmentHeads: totalHeads,
        },
      },
    });
  } catch (err) {
    console.error("getAdminDashboardStats error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong while loading admin dashboard stats.",
    });
  }
};

// Get all requests grouped by priority
const getRequestsByPriority = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    // Get all requests excluding fully closed tickets (status "C")
    const requests = await requestsCollection
      .find({ ticket_status: { $ne: "C" } })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`[getRequestsByPriority] Found ${requests.length} total requests (excluding closed)`);

    // Group requests by priority
    const groupedByPriority = {};
    
    requests.forEach((request) => {
      // Skip fully closed tickets
      if (request.ticket_status === "C") {
        return;
      }

      // Handle various cases: null, undefined, empty string, or actual priority value
      const priority = normalizePriority(request.priority);
      
      if (!groupedByPriority[priority]) {
        groupedByPriority[priority] = [];
      }
      groupedByPriority[priority].push(request);
    });

    console.log(`[getRequestsByPriority] Grouped into ${Object.keys(groupedByPriority).length} priorities:`, Object.keys(groupedByPriority));
    console.log(`[getRequestsByPriority] Priority counts:`, Object.keys(groupedByPriority).map(p => ({ priority: p, count: groupedByPriority[p].length })));
    
    // Debug: Log sample request priorities
    if (requests.length > 0) {
      console.log(`[getRequestsByPriority] Sample requests priorities:`, requests.slice(0, 5).map(r => ({ 
        id: r.id || r._id, 
        priority: r.priority,
        hasPriority: !!r.priority,
        priorityType: typeof r.priority 
      })));
    }

    // Convert to array format with priority name and requests
    // Only include priorities that have at least 1 ticket
    // Sort priorities: High, Medium, Low
    const priorityOrder = ["High", "Medium", "Low"];
    const sortedPriorities = Object.keys(groupedByPriority)
      .filter((priority) => groupedByPriority[priority].length > 0) // Only include priorities with tickets
      .sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

    const result = sortedPriorities.map((priority) => ({
      priority,
      requests: groupedByPriority[priority],
      count: groupedByPriority[priority].length,
    }));

    res.status(200).json({
      status: "success",
      message: "Successfully get requests by priority!",
      data: result,
    });
  } catch (err) {
    console.error("[getRequestsByPriority] Error:", err.message);
    console.error("[getRequestsByPriority] Stack:", err.stack);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

// Get all requests grouped by category
const getRequestsByCategory = async (req, res) => {
  try {
    const db = getDb();
    const requestsCollection = db.collection("requests");

    // Get all requests excluding fully closed tickets (status "C")
    const requests = await requestsCollection
      .find({ ticket_status: { $ne: "C" } })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`[getRequestsByCategory] Found ${requests.length} total requests (excluding closed)`);

    // Debug: Log first few requests to see their structure
    if (requests.length > 0) {
      console.log(`[getRequestsByCategory] Sample request:`, {
        id: requests[0].id || requests[0]._id,
        category: requests[0].category,
        hasCategory: !!requests[0].category,
        categoryType: typeof requests[0].category,
        status: requests[0].ticket_status,
      });
    }

    // Group requests by category
    const groupedByCategory = {};
    
    requests.forEach((request) => {
      // Skip completed/resolved tickets
      if (request.ticket_status === "D") {
        return;
      }

      // Handle various cases: null, undefined, empty string, or actual category value
      let category = "Uncategorized";
      
      if (request.category !== null && request.category !== undefined) {
        // Check if category is a non-empty string
        const categoryStr = String(request.category).trim();
        if (categoryStr.length > 0 && categoryStr !== "null" && categoryStr !== "undefined") {
          category = categoryStr;
        }
      }
      
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }
      groupedByCategory[category].push(request);
    });

    console.log(`[getRequestsByCategory] Grouped into ${Object.keys(groupedByCategory).length} categories:`, Object.keys(groupedByCategory));
    console.log(`[getRequestsByCategory] Category counts:`, Object.keys(groupedByCategory).map(cat => ({ category: cat, count: groupedByCategory[cat].length })));

    // Convert to array format with category name and requests
    // Only include categories that have at least 1 ticket
    const result = Object.keys(groupedByCategory)
      .filter((category) => groupedByCategory[category].length > 0) // Only include categories with tickets
      .map((category) => ({
        category,
        requests: groupedByCategory[category],
        count: groupedByCategory[category].length,
      }));

    res.status(200).json({
      status: "success",
      message: "Successfully get requests by category!",
      data: result,
    });
  } catch (err) {
    console.error("[getRequestsByCategory] Error:", err.message);
    console.error("[getRequestsByCategory] Stack:", err.stack);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getAllUserRequest,
  getAllUserProcess,
  updateUserProcessOnRequest,
  approveRequestAdmin,
  rejectRequestAdmin,
  approveRequestTeam,
  rejectRequestTeam,
  getDetailRequestById,
  getRequestWithRequestReply,
  reply_request,
  getUserRequestWaiting,
  getUserRequestProcess,
  getUserRequestDone,
  requestDone,
  searchData,
  filterDataByDate,
  getRequestsHead,
  getRequestsByCategory,
  getRequestsByPriority,
  getRequestAiHelp,
  getUserDashboardStats,
  getTeamDashboardStats,
  getHeadDashboardStats,
  getAdminDashboardStats,
  userResolveRequest,
  reopenTicket,
  escalateRequest,
  reassignRequest,
};
