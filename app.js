const express = require("express");
const app = express();
const mongoose = require("mongoose");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const ejs = require("ejs");
const bcrypt = require("bcrypt");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isloggedin, async (req, res) => {
  try {
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("posts");
    if (!user) {
      return res.status(404).send("User not found");
    }
    const formattedName = titleCase(user.name);
    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/like/:id", isloggedin, async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    let post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).send("Post not found");
    }
    if (!post.likes.includes(user._id)) {
      post.likes.push(user._id);
    } else {
      post.likes.splice(post.likes.indexOf(user._id), 1);
    }
    await post.save();
    res.redirect("/profile", { user }, 302);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/edit/:id", isloggedin, async (req, res) => {
  try {
    let post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).send("Post not found");
    }
    res.render("edit", { post });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post("/edit/:id", isloggedin, async (req, res) => {
  try {
    let post = await postModel.findOneAndUpdate(
      { _id: req.params.id },
      { content: req.body.content }
    );
    if (!post) {
      return res.status(404).send("Post not found");
    }
    post.content = req.body.content;
    await post.save();
    res.redirect("/profile", 302);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post("/register", async (req, res) => {
  let { username, name, age, password, email } = req.body;
  let user = await userModel.findOne({ email });
  if (user) {
    return res.status(400).send("User already exists");
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  // Create new user
  user = new userModel({
    username,
    name,
    age,
    password: hash,
    email,
  });

  // Save user to the database
  await user.save();

  // Generate JWT token
  const token = jwt.sign({ email }, "secret", { expiresIn: "1h" });

  // Set the token in cookies and send a response
  res.cookie("token", token, { httpOnly: true });
  res.send("User Created");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) {
    return res.status(400).send("User not found");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send("Invalid credentials");
  }

  // Generate JWT token
  const token = jwt.sign({ email }, "secret", { expiresIn: "1h" });

  // Set token in cookies and send a response
  res.cookie("token", token, { httpOnly: true });
  res.redirect("profile", { user });
});

app.post("/createpost", isloggedin, async (req, res) => {
  try {
    let { content } = req.body;
    let email = req.user.email;
    let user = await userModel.findOne({ email: email });

    // Create new post
    let post = new postModel({
      user: user._id,
      content,
    });
    await post.save();

    // Add the post to the user's posts array and save
    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile", { user }, 302);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/logout", async (req, res) => {
  res.clearCookie("token");
  res.send("Logged Out");
});

function isloggedin(req, res, next) {
  let token = req.cookies.token;
  jwt.verify(token, "secret", (err, data) => {
    if (err) {
      res.render("login");
    }
    req.user = data;
    next();
  });
}

function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

app.listen(3000);
