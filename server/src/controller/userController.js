const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../config/mongo");
const transporter = require("../../utils/nodemailer");

const normalizeLevel = (level) => {
  if (level === "team") return "support_engineer";
  if (level === "head") return "manager";
  return level;
};

const isSupportEngineer = (level) =>
  level === "support_engineer" || level === "team";
const isManager = (level) => level === "manager" || level === "head";

const createToken = (user) => {
  const normalizedLevel = normalizeLevel(user.level);
  const payload = {
    id: user.id,
    username: user.username,
    fullname: user.full_name,
    email: user.email,
    level: normalizedLevel,
  };
  if (isSupportEngineer(normalizedLevel) || isManager(normalizedLevel)) {
    payload.department = user.department || null;
  }
  if (user.mustChangePassword) {
    payload.mustChangePassword = true;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 14; i++) {
    pwd += chars[crypto.randomInt(0, chars.length)];
  }
  return pwd;
};

// const loginAdmin = async (req, res) => {
//   const { username, password } = req.body;

//   const user = await User.findOne({ where: { username: username } });

//   if (!user) {
//     return res.status(400).json({
//       status: "failed",
//       message: "Failed to login!",
//     });
//   }

//   const token = createToken({
//     id: user.id,
//     username: user.username,
//     email: user.email,
//     level: user.level,
//   });

//   res.status(200).json({
//     status: "success",
//     message: "Login successfully!",
//     data: {
//       username: username,
//       level: "admin",
//       token: token,
//     },
//   });
// };

const loginUser = async (req, res) => {
  const { id_karyawan, password } = req.body;

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    // Allow login by employee id OR username (typed into the same field)
    const user = await usersCollection.findOne({
      $or: [{ id_karyawan }, { username: id_karyawan }],
    });

    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "User not found!",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        status: "error",
        message: "ID atau Password salah!",
      });
    }

    // Support both hashed and legacy plain-text passwords
    let isMatch = false;
    if (typeof user.password === "string" && user.password.startsWith("$2")) {
      // bcrypt hash
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // legacy plain-text
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "ID atau Password salah!",
      });
    }

    const mustChangePassword = Boolean(user.mustChangePassword);

    const token = createToken({
      id: user._id.toString(),
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      level: normalizeLevel(user.level),
      department: user.department,
      mustChangePassword,
    });

    if (user.level !== normalizeLevel(user.level)) {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { level: normalizeLevel(user.level), updatedAt: new Date() } }
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Login successfully!",
      data: {
        username: user.username,
        fullname: user.full_name,
        level: normalizeLevel(user.level),
        email: user.email,
        token: token,
        mustChangePassword,
      },
    });
  } catch (err) {
    console.error("Mongo login error:", err.message);
    return res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({ username: { $ne: "admin" } })
      .project({ username: 1, email: 1, level: 1 })
      .toArray();

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo getAllUsers error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getAllUserWithUsernameTeam = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({ level: { $in: ["support_engineer", "team"] } })
      .project({ full_name: 1, username: 1, email: 1, level: 1, department: 1 })
      .toArray();

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo getAllUserWithUsernameTeam error:", err.message);
    return res.status(400).json({
      status: "failed",
      message: "Failed to get all users!",
    });
  }
};

const getAllUserAdmin = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({ level: "admin" })
      .project({ full_name: 1, username: 1, email: 1, level: 1 })
      .toArray();

    if (!users) {
      return res.status(400).json({
        status: "failed",
        message: "Failed to get all users!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo getAllUserAdmin error:", err.message);
    return res.status(400).json({
      status: "failed",
      message: "Failed to get all users!",
    });
  }
};

const getAllUserHead = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({ level: { $in: ["manager", "head"] } })
      .project({ full_name: 1, username: 1, email: 1, level: 1, department: 1 })
      .toArray();

    if (!users) {
      return res.status(400).json({
        status: "failed",
        message: "Failed to get all users!",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo getAllUserHead error:", err.message);
    return res.status(400).json({
      status: "failed",
      message: "Failed to get all users!",
    });
  }
};

const DEPARTMENTS = ["IT", "HR", "Finance", "Sales"];

const createUser = async (req, res) => {
  const { id_karyawan, full_name, username, email, level, department } = req.body;
  const normalizedLevel = normalizeLevel(level);

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "A valid email is required so the temporary password can be sent.",
      });
    }

    if (
      (isSupportEngineer(normalizedLevel) || isManager(normalizedLevel)) &&
      (!department || !DEPARTMENTS.includes(department))
    ) {
      return res.status(400).json({
        status: "failed",
        message:
          "Department (IT, HR, Finance, or Sales) is required for support engineer and manager users.",
      });
    }

    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = {
      id_karyawan: id_karyawan || username,
      full_name,
      username,
      email: email.trim(),
      level: normalizedLevel,
      password: hashedPassword,
      mustChangePassword: true,
      department:
        isSupportEngineer(normalizedLevel) || isManager(normalizedLevel)
          ? department
          : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    const appUrl =
      process.env.APP_PUBLIC_URL || process.env.CLIENT_URL || "http://localhost:3000";
    const mailOptions = {
      from: `"Service Desk" <${process.env.MAIL_USER}>`,
      to: newUser.email,
      subject: "Your Service Desk account",
      html: `
        <p>Hello ${full_name || username},</p>
        <p>An administrator created an account for you on the Service Desk system.</p>
        <p><strong>Username / Employee ID:</strong> ${username}</p>
        <p><strong>Temporary password:</strong> ${plainPassword}</p>
        <p>Sign in with this password, then you will be asked to choose a new password.</p>
        <p>If you did not expect this email, contact your administrator.</p>
      `,
    };

    let emailSent = true;
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error("createUser sendMail error:", mailErr.message);
      emailSent = false;
    }

    const safeData = {
      _id: result.insertedId,
      id_karyawan: newUser.id_karyawan,
      full_name: newUser.full_name,
      username: newUser.username,
      email: newUser.email,
      level: newUser.level,
      department: newUser.department,
      mustChangePassword: true,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      emailSent,
      ...(emailSent ? {} : { temporaryPassword: plainPassword }),
    };

    res.status(200).json({
      status: "success",
      message: emailSent
        ? "User created. A temporary password was sent to their email."
        : "User created, but the welcome email could not be sent. Share the temporary password with the user manually and check SMTP settings (MAIL_USER / MAIL_PASS).",
      data: safeData,
    });
  } catch (err) {
    console.error("Mongo createUser error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const deleteUserById = async (req, res) => {
  const { id_user, level } = req.params;

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    await usersCollection.deleteOne({ _id: new ObjectId(id_user) });

    res.status(200).json({
      status: "success",
      message: "Successfully delete user!",
    });
  } catch (err) {
    console.error("Mongo deleteUserById error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const updateUser = async (req, res) => {
  const { id_user } = req.params;
  const { full_name, username, email, level, password, department } = req.body;
  const normalizedLevel = normalizeLevel(level);

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const updateDoc = {
      full_name,
      username,
      email,
      level: normalizedLevel,
      updatedAt: new Date(),
    };

    if (isSupportEngineer(normalizedLevel) || isManager(normalizedLevel)) {
      if (!department || !DEPARTMENTS.includes(department)) {
        return res.status(400).json({
          status: "failed",
          message:
            "Department (IT, HR, Finance, or Sales) is required for support engineer and manager users.",
        });
        }
      updateDoc.department = department;
    } else {
      updateDoc.department = null;
    }

    if (password) {
      updateDoc.password = await bcrypt.hash(password, 10);
      updateDoc.mustChangePassword = false;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id_user) },
      {
        $set: updateDoc,
      }
    );

    res.status(200).json({
      status: "success",
      message: "Successfully update user!",
      data: result,
    });
  } catch (err) {
    console.error("Mongo updateUser error:", err.message);
    res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getLevelUserCount = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");
    const userCount = await usersCollection.countDocuments({ level: "user" });

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: userCount,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({
      status: "failed",
      message: "Failed to get all users!",
    });
  }
};

const getLevelTeamCount = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");
    const userCount = await usersCollection.countDocuments({
      level: { $in: ["support_engineer", "team"] },
    });

    res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: userCount,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({
      status: "failed",
      message: "Failed to get all users!",
    });
  }
};

// const searchUserAdmin = async (req, res) => {
//   const { user } = req.query;

//   const users = await UserAdmin.findAll({
//     attributes: ["id", "full_name", "username", "email", "level"],
//     where: {
//       [Op.or]: [
//         { full_name: { [Op.like]: `%${user}%` } },
//         { username: { [Op.like]: `%${user}%` } },
//         { email: { [Op.like]: `%${user}%` } },
//       ],
//     },
//   });

//   if (users.length == 0) {
//     return res.status(400).json({
//       status: "failed",
//       message: "User not found!",
//     });
//   }

//   return res.status(200).json({
//     status: "success",
//     message: "Get all users successfully!",
//     data: users,
//   });
// };

const searchUser = async (req, res) => {
  const { user, level } = req.query;
  let users;

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const orConditions =
      level === "true"
        ? [
            { full_name: { $regex: user, $options: "i" } },
            { username: { $regex: user, $options: "i" } },
            { email: { $regex: user, $options: "i" } },
          ]
        : [
            { username: { $regex: user, $options: "i" } },
            { email: { $regex: user, $options: "i" } },
          ];

    users = await usersCollection
      .find({ $or: orConditions })
      .project({ full_name: 1, username: 1, email: 1, level: 1 })
      .toArray();

    if (!users || users.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "User not found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo searchUser error:", err.message);
    return res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const changeOwnPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.decoded.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: "failed",
      message: "Current password and new password are required.",
    });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({
      status: "failed",
      message: "New password must be at least 8 characters.",
    });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user || !user.password) {
      return res.status(400).json({
        status: "failed",
        message: "User not found.",
      });
    }

    let isMatch = false;
    if (typeof user.password === "string" && user.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isMatch = user.password === currentPassword;
    }

    if (!isMatch) {
      return res.status(400).json({
        status: "failed",
        message: "Current password is incorrect.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      }
    );

    const normalizedLevel = normalizeLevel(user.level);
    const token = createToken({
      id: user._id.toString(),
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      level: normalizedLevel,
      department: user.department,
      mustChangePassword: false,
    });

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully.",
      data: { token },
    });
  } catch (err) {
    console.error("Mongo changeOwnPassword error:", err.message);
    return res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

const getEmployee = async (req, res) => {
  try {
    const db = getDb();
    const employeesCollection = db.collection("employees");

    const users = await employeesCollection
      .find({}, { projection: { EmployeeID: 1, EmployeeName: 1 } })
      .toArray();

    if (!users) {
      return res.status(400).json({
        status: "failed",
        message: "User not found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Get all users successfully!",
      data: users,
    });
  } catch (err) {
    console.error("Mongo getEmployee error:", err.message);
    return res.status(500).json({
      status: "failed",
      message: "Something went wrong!",
    });
  }
};

module.exports = {
  // loginAdmin,
  loginUser,
  getAllUsers,
  getAllUserWithUsernameTeam,
  getLevelUserCount,
  getLevelTeamCount,
  getAllUserAdmin,
  getAllUserHead,
  createUser,
  changeOwnPassword,
  deleteUserById,
  updateUser,
  // searchUserAdmin,
  searchUser,
  getEmployee,
};
