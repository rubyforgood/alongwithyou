class MedicationsController < ApplicationController
  before_action :set_medication, only: %i[ show edit update destroy ]

  # GET /medications or /medications.json
  def index
    @medications = Medication.all
  end

  # GET /medications/1 or /medications/1.json
  def show
  end

  # GET /medications/new
  def new
    @medication = Medication.new
  end

  # GET /medications/1/edit
  def edit
  end

  # POST /medications or /medications.json
  def create
    @medication = Medication.new(medication_params)

    respond_to do |format|
      if @medication.save
        format.html { redirect_to @medication, notice: "Medication was successfully created." }
        format.json { render :show, status: :created, location: @medication }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @medication.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /medications/1 or /medications/1.json
  def update
    respond_to do |format|
      if @medication.update(medication_params)
        format.html { redirect_to @medication, notice: "Medication was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @medication }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @medication.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /medications/1 or /medications/1.json
  def destroy
    @medication.destroy!

    respond_to do |format|
      format.html { redirect_to medications_path, notice: "Medication was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_medication
      @medication = Medication.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def medication_params
      params.expect(medication: [ :name, :medication_type_id, :current, :dosage, :frequency, :time_of_day, :form, :purpose, :start_date, :stop_date, :refill, :notes ])
    end
end
