"use client";

import React from "react";
import styles from "./page.module.css";
import Hero from "./components/hero";

const Home = () => {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Hero />
      </div>
    </main>
  );
};

export default Home;
