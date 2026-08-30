const worker = {
  fetch() {
    return new Response(null, { status: 204 });
  },
};

export default worker;
