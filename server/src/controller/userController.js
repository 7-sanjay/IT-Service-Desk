const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../config/mongo");

const createToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    fullname: user.full_name,
    email: user.email,
    level: user.level,
  };
  if (user.level === "team" || user.level === "head") {
    payload.department = user.department || null;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
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

    const token = await createToken({
      id: user._id.toString(),
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      level: user.level,
      department: user.department,
    });

    return res.status(200).json({
      status: "success",
      message: "Login successfully!",
      data: {
        username: user.username,
        fullname: user.full_name,
        level: user.level,
        email: user.email,
        token: token,
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
      .find({ level: "team" })
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
      .find({ level: "head" })
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
  const { id_karyawan, full_name, username, email, level, password, department } = req.body;

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    if (!password) {
      return res.status(400).json({
        status: "failed",
        message: "Password is required",
      });
    }

    if ((level === "team" || level === "head") && (!department || !DEPARTMENTS.includes(department))) {
      return res.status(400).json({
        status: "failed",
        message: "Department (IT, HR, Finance, or Sales) is required for team and head users.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id_karyawan: id_karyawan || username,
      full_name,
      username,
      email,
      level,
      password: hashedPassword,
      department: level === "team" || level === "head" ? department : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(200).json({
      status: "success",
      message: "Successfully create new user!",
      data: { _id: result.insertedId, ...newUser },
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

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const updateDoc = {
      full_name,
      username,
      email,
      level,
      updatedAt: new Date(),
    };

    if (level === "team" || level === "head") {
      if (!department || !DEPARTMENTS.includes(department)) {
        return res.status(400).json({
          status: "failed",
          message: "Department (IT, HR, Finance, or Sales) is required for team and head users.",
        });
        }
      updateDoc.department = department;
    } else {
      updateDoc.department = null;
    }

    if (password) {
      updateDoc.password = await bcrypt.hash(password, 10);
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
    const userCount = await usersCollection.countDocuments({ level: "team" });

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
  deleteUserById,
  updateUser,
  // searchUserAdmin,
  searchUser,
  getEmployee,
};
