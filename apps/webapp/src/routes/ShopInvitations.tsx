import React from "react";
import { useParams } from "react-router-dom";
export default function ShopInvitations() {
  const { slug } = useParams();
  return <div style={{ padding: 16 }}>Demo page: <b>Invitations & Roles</b> for <code>{slug}</code></div>;
}
